import type { ProxyRequest, ProxyResult, ProxyError, RequestLogData } from "./types.js";
import type { ProviderAdapter } from "../provider/adapter.js";
import type { ProviderError as PProviderError } from "../provider/types.js";
import { ModelResolver } from "../model/resolver.js";
import { AdapterRegistry } from "../provider/registry.js";
import {
  ModelNotFoundError,
  AllProvidersFailedError,
} from "../model/errors.js";
import {
  formatStreamChunk,
  formatStreamDone,
  formatCompletion,
  generateId,
} from "./formatter.js";

const DEFAULT_TIMEOUT = 120_000;
const MAX_FALLBACK_ATTEMPTS = 5;
const textEncoder = new TextEncoder();

type FetchFn = typeof fetch;

function generateCorrelationId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ProviderCredentials {
  baseUrl: string;
  apiKey: string;
}

export interface ProxyHandlerOptions {
  resolver: ModelResolver;
  registry: AdapterRegistry;
  getProviderCredentials?: (providerId: string) => Promise<ProviderCredentials | null>;
  timeout?: number;
  fetchFn?: FetchFn;
  onLog?: (log: RequestLogData) => void;
}

export class ProxyHandler {
  private resolver: ModelResolver;
  private registry: AdapterRegistry;
  private getProviderCredentials?: (providerId: string) => Promise<ProviderCredentials | null>;
  private timeout: number;
  private fetchFn: FetchFn;
  private onLog?: (log: RequestLogData) => void;

  constructor(options: ProxyHandlerOptions) {
    this.resolver = options.resolver;
    this.registry = options.registry;
    this.getProviderCredentials = options.getProviderCredentials;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.onLog = options.onLog;
  }

  async handle(request: ProxyRequest): Promise<ProxyResult> {
    const start = performance.now();
    const id = request.requestId || generateId();
    const endpointId = request.endpointId;

    const abortController = new AbortController();
    const onExternalAbort = () => abortController.abort();
    if (request.signal?.aborted) {
      abortController.abort();
    }
    request.signal?.addEventListener("abort", onExternalAbort);

    try {
      return await this.handleWithAbort(request, start, id, endpointId, abortController);
    } finally {
      request.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  private async handleWithAbort(
    request: ProxyRequest,
    start: number,
    id: string,
    endpointId: string | undefined,
    abortController: AbortController,
  ): Promise<ProxyResult> {

    // Retry loop: on rate limit, mark unhealthy and try next provider
    const attemptedProviders = new Set<string>();

    for (let attempt = 0; attempt < MAX_FALLBACK_ATTEMPTS; attempt++) {
      // Resolve model — unhealthy providers are skipped by resolver
      let resolved;
      try {
        resolved = this.resolver.resolve(request.model);
      } catch (err) {
        const status = err instanceof ModelNotFoundError ? 404
          : err instanceof AllProvidersFailedError ? 503
          : 500;
        const correlationId = generateCorrelationId();
        const code = err instanceof ModelNotFoundError ? "model_not_found"
          : err instanceof AllProvidersFailedError ? "all_providers_failed"
          : "internal_error";
        const rawMessage = err instanceof Error ? err.message : "Unknown error";
        this.emitLog({
          model: request.model,
          providerId: "",
          providerModel: "",
          adapterType: "",
          stream: request.stream,
          status,
          durationMs: performance.now() - start,
          error: rawMessage,
          endpointId,
          correlationId,
        });
        const error: ProxyError = {
          code,
          message: "An internal error occurred. Please try again later.",
          type: err instanceof Error ? err.name : "Error",
          correlationId,
        };
        return { ok: false, status, error };
      }

      const { providerId, providerModel, adapterType, overrides } = resolved;

      // Prevent retrying the same provider
      if (attemptedProviders.has(providerId)) continue;
      attemptedProviders.add(providerId);

      // Look up provider credentials (baseUrl, apiKey) if available
      let credentials: ProviderCredentials | null = null;
      if (this.getProviderCredentials) {
        credentials = await this.getProviderCredentials(providerId);
      }

      const adapter = this.registry.get(adapterType);

      // Merge model-level overrides with request overrides
      // Inject provider credentials into overrides so adapters can use them
      const mergedOverrides = {
        ...overrides,
        ...request.overrides,
        ...(credentials ? { baseUrl: credentials.baseUrl, apiKey: credentials.apiKey } : {}),
      };

      const providerRequest = adapter.createRequest({
        model: providerModel,
        messages: request.messages,
        stream: request.stream,
        overrides: mergedOverrides,
      });

      let response: Response;
      try {
        response = await this.fetchWithTimeout(providerRequest.url, {
          method: "POST",
          headers: providerRequest.headers,
          body: JSON.stringify(providerRequest.body),
        }, abortController, request.signal);
      } catch (err) {
        const isTimeout = isTimeoutError(err);
        const status = isTimeout ? 504 : 502;
        const correlationId = generateCorrelationId();
        const code = isTimeout ? "timeout" : "network_error";
        const rawMessage = err instanceof Error ? err.message : "Network error";
        this.emitLog({
          model: request.model,
          providerId,
          providerModel,
          adapterType,
          stream: request.stream,
          status,
          durationMs: performance.now() - start,
          error: rawMessage,
          endpointId,
          correlationId,
        });
        const error: ProxyError = {
          code,
          message: "An internal error occurred. Please try again later.",
          type: isTimeout ? "TimeoutError" : "NetworkError",
          correlationId,
        };
        return { ok: false, status, error };
      }

      // Handle provider errors
      if (!response.ok) {
        let providerError: PProviderError;
        try {
          providerError = await adapter.parseError(response);
        } catch {
          providerError = {
            code: "unknown",
            message: `Provider returned status ${response.status}`,
            status: response.status,
            retryable: response.status >= 500,
          };
        }

        // Rate limit before streaming starts → mark unhealthy and retry with next provider
        if (adapter.isRateLimitError(providerError)) {
          this.resolver.markUnhealthy(providerId);
          // Continue to next iteration — resolver will skip this provider
          continue;
        }

        // Non-rate-limit error → return immediately
        const correlationId = generateCorrelationId();

        this.emitLog({
          model: request.model,
          providerId,
          providerModel,
          adapterType,
          stream: request.stream,
          status: providerError.status,
          durationMs: performance.now() - start,
          error: providerError.message,
          endpointId,
          correlationId,
          providerErrorCode: providerError.code,
        });

        const error: ProxyError = {
          code: providerError.code,
          message: "An internal error occurred. Please try again later.",
          type: "provider_error",
          correlationId,
        };

        return { ok: false, status: providerError.status, error };
      }

      // Success — proceed with streaming or non-streaming
      if (request.stream) {
        return this.handleStream(id, request.model, providerModel, adapterType, providerId, response, adapter, start, request.stream, endpointId, abortController);
      }

      return this.handleNonStream(id, request.model, providerModel, adapterType, providerId, response, adapter, start, request.stream, endpointId);
    }

    // Exhausted all fallback attempts
    const correlationId = generateCorrelationId();
    const error: ProxyError = {
      code: "all_providers_failed",
      message: "An internal error occurred. Please try again later.",
      type: "ProviderError",
      correlationId,
    };
    this.emitLog({
      model: request.model,
      providerId: "",
      providerModel: "",
      adapterType: "",
      stream: request.stream,
      status: 503,
      durationMs: performance.now() - start,
      error: "All providers rate-limited or unavailable",
      endpointId,
      correlationId,
    });
    return { ok: false, status: 503, error };
  }

  private handleStream(
    id: string,
    model: string,
    providerModel: string,
    adapterType: string,
    providerId: string,
    response: Response,
    adapter: ProviderAdapter,
    start: number,
    isStream: boolean,
    endpointId: string | undefined,
    abortController?: AbortController,
  ): ProxyResult {
    const body = response.body;
    if (!body) {
      const correlationId = generateCorrelationId();
      this.emitLog({
        model,
        providerId,
        providerModel,
        adapterType,
        stream: isStream,
        status: 502,
        durationMs: performance.now() - start,
        error: "Provider returned no body for stream",
        endpointId,
        correlationId,
      });
      const error: ProxyError = {
        code: "no_body",
        message: "An internal error occurred. Please try again later.",
        type: "provider_error",
        correlationId,
      };
      return { ok: false, status: 502, error };
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalUsage: { promptTokens: number; completionTokens: number } | undefined;
    let lastFinishReason: string | undefined;
    let hadError = false;

    const stream = new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            // Flush remaining buffer
            if (buffer.trim()) {
              const parsed = adapter.parseSSEChunk(buffer);
              if (parsed) {
                if (parsed.usage) {
                  totalUsage = mergeUsage(totalUsage, parsed.usage);
                }
            if (parsed.content || parsed.thinking || parsed.tool_calls || parsed.finish_reason) {
                  const chunk = formatStreamChunk(id, providerModel, {
                    ...parsed,
                    done: false,
                  });
                  controller.enqueue(textEncoder.encode(chunk));
                }
              }
            }
            // Send final chunk with done
            const finalChunk = formatStreamChunk(id, providerModel, {
              done: true,
              finish_reason: lastFinishReason,
              ...(totalUsage ? { usage: totalUsage } : {}),
            });
            controller.enqueue(textEncoder.encode(finalChunk));
            controller.enqueue(textEncoder.encode(formatStreamDone()));
            controller.close();

            this.emitLog({
              model,
              providerId,
              providerModel,
              adapterType,
              stream: isStream,
              status: 200,
              durationMs: performance.now() - start,
              tokens: totalUsage,
              endpointId,
            });
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          // Keep last incomplete part in buffer
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;
            const parsed = adapter.parseSSEChunk(part);
            if (!parsed) continue;

            if (parsed.usage) {
              totalUsage = mergeUsage(totalUsage, parsed.usage);
            }

            if (parsed.done) {
              if (parsed.finish_reason) lastFinishReason = parsed.finish_reason;
              continue;
            }

            if (parsed.finish_reason) lastFinishReason = parsed.finish_reason;

            if (parsed.content || parsed.thinking || parsed.tool_calls || parsed.finish_reason) {
              const chunk = formatStreamChunk(id, providerModel, parsed);
              controller.enqueue(textEncoder.encode(chunk));
            }
          }
        } catch (err) {
          if (!hadError) {
            hadError = true;
            void reader.cancel();
            const correlationId = generateCorrelationId();
            const rawMsg = err instanceof Error ? err.message : "Stream error";
            this.emitLog({
              model,
              providerId,
              providerModel,
              adapterType,
              stream: isStream,
              status: 500,
              durationMs: performance.now() - start,
              error: rawMsg,
              endpointId,
              correlationId,
            });
            const masked = new Error("An internal error occurred. Please try again later.");
            masked.name = "StreamError";
            controller.error(masked);
          } else {
            controller.error(err);
          }
        }
      },
      cancel: async () => {
        abortController?.abort();
        await reader.cancel();
      },
    });

    return {
      ok: true,
      status: 200,
      body: stream,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    };
  }

  private async handleNonStream(
    id: string,
    model: string,
    providerModel: string,
    adapterType: string,
    providerId: string,
    response: Response,
    adapter: ProviderAdapter,
    start: number,
    isStream: boolean,
    endpointId?: string,
  ): Promise<ProxyResult> {
    let content: string | null;
    let usage: { promptTokens: number; completionTokens: number };
    let toolCalls: import("../provider/types.js").ToolCall[] | undefined;
    let finishReason: string | undefined;

    // If the provider response is SSE despite non-stream request, parse it
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.startsWith("text/event-stream")) {
      // Read the whole body as text and parse SSE chunks
      const text = await response.text();
      let accumulated = "";
      let totalUsage: { promptTokens: number; completionTokens: number } | undefined;
      let accumulatedToolCalls: import("../provider/types.js").ToolCallDelta[] | undefined;

      const parts = text.split("\n\n");
      for (const part of parts) {
        if (!part.trim()) continue;
        const parsed = adapter.parseSSEChunk(part);
        if (!parsed) continue;
        if (parsed.content) accumulated += parsed.content;
        if (parsed.usage) totalUsage = mergeUsage(totalUsage, parsed.usage);
        if (parsed.tool_calls) {
          accumulatedToolCalls = [...(accumulatedToolCalls ?? []), ...parsed.tool_calls];
        }
        if (parsed.finish_reason) finishReason = parsed.finish_reason;
      }

      content = accumulated || "";
      usage = totalUsage ?? { promptTokens: 0, completionTokens: 0 };

      if (accumulatedToolCalls && accumulatedToolCalls.length > 0) {
        toolCalls = mergeToolCallDeltas(accumulatedToolCalls);
      }
    } else {
      // JSON response — parse and normalize
      const json = await response.json() as Record<string, unknown>;

      // Try OpenAI format
      const choices = json.choices as Array<Record<string, unknown>> | undefined;
      if (choices && choices.length > 0) {
        const choice = choices[0]!;
        const msg = choice.message as Record<string, unknown> | undefined;
        content = (msg?.content as string | null) ?? null;
        if (Array.isArray(msg?.tool_calls)) {
          toolCalls = msg!.tool_calls as import("../provider/types.js").ToolCall[];
        }
        if (typeof choice.finish_reason === "string") {
          finishReason = choice.finish_reason;
        }
      } else {
        // Anthropic non-stream format
        const jsonContent = json.content as Array<Record<string, unknown>> | undefined;
        if (jsonContent) {
          content = jsonContent
            .filter((b) => b.type === "text")
            .map((b) => b.text as string)
            .join("");
          const toolUseBlocks = jsonContent.filter((b) => b.type === "tool_use");
          if (toolUseBlocks.length > 0) {
            toolCalls = toolUseBlocks.map((b, i) => ({
              index: i,
              id: b.id as string,
              type: "function" as const,
              function: {
                name: b.name as string,
                arguments: typeof b.input === "string" ? b.input : JSON.stringify(b.input ?? {}),
              },
            }));
            finishReason = "tool_calls";
          }
        } else {
          content = null;
        }
      }

      const jsonUsage = json.usage as Record<string, unknown> | undefined;
      if (jsonUsage) {
        usage = {
          promptTokens: (jsonUsage.prompt_tokens as number) ?? (jsonUsage.input_tokens as number) ?? 0,
          completionTokens: (jsonUsage.completion_tokens as number) ?? (jsonUsage.output_tokens as number) ?? 0,
        };
      } else {
        usage = { promptTokens: 0, completionTokens: 0 };
      }
    }

    const body = formatCompletion(id, providerModel, content, usage, toolCalls, finishReason);

    this.emitLog({
      model,
      providerId,
      providerModel,
      adapterType,
      stream: isStream,
      status: 200,
      durationMs: performance.now() - start,
      tokens: usage,
      endpointId,
    });

    return {
      ok: true,
      status: 200,
      body,
      headers: { "Content-Type": "application/json" },
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit, abortController: AbortController, externalSignal?: AbortSignal): Promise<Response> {
    const timer = setTimeout(() => abortController.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        ...init,
        signal: abortController.signal,
      });
      return response;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Client disconnect, not timeout
        if (externalSignal?.aborted) {
          throw err;
        }
        throw new TimeoutError(this.timeout);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private emitLog(log: RequestLogData): void {
    this.onLog?.(log);
  }
}

class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

// Re-export for consumers who need isTimeoutError
export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof TimeoutError;
}

export function mergeUsage(
  existing: { promptTokens: number; completionTokens: number } | undefined,
  incoming: { promptTokens: number; completionTokens: number },
): { promptTokens: number; completionTokens: number } {
  if (!existing) return { ...incoming };
  return {
    promptTokens: existing.promptTokens + incoming.promptTokens,
    completionTokens: existing.completionTokens + incoming.completionTokens,
  };
}

function mergeToolCallDeltas(deltas: import("../provider/types.js").ToolCallDelta[]): import("../provider/types.js").ToolCall[] {
  const map = new Map<number, import("../provider/types.js").ToolCall>();
  for (const d of deltas) {
    const existing = map.get(d.index);
    if (!existing) {
      map.set(d.index, {
        index: d.index,
        id: d.id,
        type: d.type ?? "function",
        function: {
          name: d.function?.name ?? "",
          arguments: d.function?.arguments ?? "",
        },
      });
    } else {
      if (d.id) existing.id = d.id;
      if (d.type) existing.type = d.type;
      if (d.function?.name) existing.function = { name: d.function.name, arguments: existing.function?.arguments ?? "" };
      if (d.function?.arguments) existing.function = { name: existing.function?.name ?? "", arguments: (existing.function?.arguments ?? "") + d.function.arguments };
    }
  }
  return Array.from(map.values());
}
