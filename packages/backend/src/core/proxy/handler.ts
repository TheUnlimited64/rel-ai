import type { ProxyRequest, ProxyResult, ProxyError, RequestLogData } from "./types.js";
import type { ProviderAdapter } from "../provider/adapter.js";
import type { ProviderError as PProviderError, ToolCallDelta } from "../provider/types.js";
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
const MAX_STREAM_RETRIES = 2;

type FetchFn = typeof fetch;

interface StreamRetryContext {
  fetchFn: FetchFn;
  abortController: AbortController;
  requestUrl: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  adapter: ProviderAdapter;
  timeout: number;
}

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
    const msgSummary = request.messages.map((m) => {
      if (m.tool_calls) return `${m.role}:<tool_calls:${String(m.tool_calls.length)}>`;
      if (m.role === "tool") return `tool:<result>`;
      return `${m.role}:${(typeof m.content === "string" ? m.content : "").slice(0, 40)}`;
    }).join(" → ");
    console.log(`[PROXY-REQ] ${id} model=${request.model} stream=${String(request.stream)} msgs=[${msgSummary}]`);
    const onExternalAbort = () => {
      console.error(`[ABORT] Request ${id} externally aborted at ${String(Math.round(performance.now() - start))}ms`);
      abortController.abort();
    };
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
            message: `Provider returned status ${String(response.status)}`,
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
        const retryContext: StreamRetryContext = {
          fetchFn: this.fetchFn,
          abortController,
          requestUrl: providerRequest.url,
          requestHeaders: providerRequest.headers,
          requestBody: JSON.stringify(providerRequest.body),
          adapter,
          timeout: this.timeout,
        };
        return this.handleStream(id, request.model, providerModel, adapterType, providerId, response, adapter, start, request.stream, endpointId, retryContext);
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
    retryContext?: StreamRetryContext,
  ): ProxyResult {
    if ("resetStreamState" in adapter && typeof adapter.resetStreamState === "function") {
      (adapter.resetStreamState as () => void)();
    }
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

    const decoder = new TextDecoder();
    let buffer = "";
    let totalUsage: { promptTokens: number; completionTokens: number } | undefined;
    let lastFinishReason: string | undefined;
    let hadError = false;
    let streamClosed = false;
    let receivedExplicitTermination = false;
    let responseStatus = 200;
    let keepaliveTimer: ReturnType<typeof setInterval> | undefined;
    let currentReader = body.getReader();
    let retriesRemaining = MAX_STREAM_RETRIES;
    let contentEnqueued = false;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        // Unconditional keepalive: send SSE comment every 5s while buffering
        // so the client sees regular data and doesn't timeout.
        const KEEPALIVE_INTERVAL_MS = 5_000;
        keepaliveTimer = setInterval(() => {
          if (streamClosed) { clearInterval(keepaliveTimer); return; }
          try {
            controller.enqueue(textEncoder.encode(": keepalive\n\n"));
          } catch {
            // Transient enqueue failure — don't kill keepalive, retry next tick
          }
        }, KEEPALIVE_INTERVAL_MS);

        // Push-based pump: stream downstream in real-time with unconditional
        // keepalive to prevent client timeout during CC's agentic loop.
        const pump = async () => {
          try {
            let readCount = 0;
            let lastReadTime = performance.now();
            for (;;) {
              const { done, value } = await currentReader.read();
              const now = performance.now();
              const readGap = now - lastReadTime;
              lastReadTime = now;
              readCount++;
              if (readGap > 3000 || readCount <= 3) {
                console.log(`[STREAM-READ] ${id} #${String(readCount)} gap=${String(Math.round(readGap))}ms done=${String(done)} len=${String(value?.length ?? 0)}`);
              }
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const delimiter = adapter.streamDelimiter ?? "\n\n";
              const parts = buffer.split(delimiter);
              buffer = parts.pop() ?? "";

              for (const part of parts) {
                if (!part.trim()) continue;
                const parsed = adapter.parseSSEChunk(part);

                if (!parsed) continue;

                if (parsed.usage) {
                  totalUsage = mergeUsage(totalUsage, parsed.usage, parsed.usageMode);
                }

                // Emit content/thinking/tool_calls BEFORE checking done.
                // CC can send tool_call + finish in the same chunk — if we
                // skip this, the client gets finish_reason without tool data.
                // Separate tool_calls from finish_reason: tool_call deltas
                // must have finish_reason=null so opencode processes tool calls
                // before seeing the final finish_reason-only chunk.
                // NOTE: intermediate finish_reason (e.g. from CC's finish-step)
                // is intentionally NOT emitted here — it would cause clients
                // to close the stream before CC's agentic loop completes.
                // finish_reason is only sent in the final done chunk below.
                if (parsed.content || parsed.thinking || parsed.tool_calls) {
                  contentEnqueued = true;
                  if (parsed.tool_calls) {
                    const tcNames = parsed.tool_calls.map((tc: ToolCallDelta) => `${tc.function?.name ?? ""}(${tc.id ?? ""})`).join(', ');
                    console.log(`[STREAM-TC] ${id} tool_calls: ${tcNames} at ${String(Math.round(performance.now() - start))}ms`);
                  }
                  // Diagnostic: log chunk type to trace event flow
                  const chunkType = parsed.tool_calls ? 'TC' : parsed.finish_reason ? `FR(${parsed.finish_reason})` : parsed.content ? 'CONTENT' : parsed.thinking ? 'THINK' : 'OTHER';
                  console.log(`[CHUNK] ${id} type=${chunkType} at ${String(Math.round(performance.now() - start))}ms`);
                  // When tool_calls present, emit without finish_reason so
                  // opencode processes tool calls before seeing finish_reason.
                  // The done chunk below provides finish_reason separately.
                  const emitParsed = parsed.tool_calls
                    ? { ...parsed, finish_reason: undefined, done: false }
                    : parsed;
                  const chunk = formatStreamChunk(id, providerModel, emitParsed);
                  controller.enqueue(textEncoder.encode(chunk));
                }

                if (parsed.done) {
                  receivedExplicitTermination = true;
                  if (parsed.finish_reason) lastFinishReason = parsed.finish_reason;
                  if (lastFinishReason && !streamClosed) {
                    streamClosed = true;
                    const doneChunk = formatStreamChunk(id, providerModel, {
                      done: true,
                      finish_reason: lastFinishReason,
                      ...(totalUsage ? { usage: totalUsage } : {}),
                    });
                    controller.enqueue(textEncoder.encode(doneChunk));
                    controller.enqueue(textEncoder.encode(formatStreamDone()));
                    clearInterval(keepaliveTimer);
                    console.log(`[STREAM-DONE] ${id} ${lastFinishReason} at ${String(Math.round(performance.now() - start))}ms, usage=${JSON.stringify(totalUsage)}`);
                    currentReader.cancel().catch(() => {});
                    try { controller.close(); } catch {}
                    break;
                  }
                  continue;
                }

                if (parsed.finish_reason) lastFinishReason = parsed.finish_reason;
              }
            }

            // Flush remaining buffer
            if (!streamClosed && buffer.trim()) {
              const parsed = adapter.parseSSEChunk(buffer);
              if (parsed) {
                if (parsed.usage) {
                  totalUsage = mergeUsage(totalUsage, parsed.usage, parsed.usageMode);
                }
                if (parsed.content || parsed.thinking || parsed.tool_calls) {
                  contentEnqueued = true;
                  if (receivedExplicitTermination) {
                    // Normal case: emit with done:false so flush content does not
                    // carry a premature termination signal to the client.
                    const emitParsed = parsed.tool_calls
                      ? { ...parsed, finish_reason: undefined, done: false }
                      : { ...parsed, done: false };
                    const chunk = formatStreamChunk(id, providerModel, emitParsed);
                    controller.enqueue(textEncoder.encode(chunk));
                  } else {
                    // No explicit termination received — stream closed without
                    // a done chunk. Emit content only, skip done/finish_reason
                    // so the stream-close block below handles termination.
                    const emitParsed = parsed.tool_calls
                      ? { ...parsed, finish_reason: undefined }
                      : { ...parsed };
                    const chunk = formatStreamChunk(id, providerModel, emitParsed);
                    controller.enqueue(textEncoder.encode(chunk));
                  }
                }
                if (receivedExplicitTermination) {
                  if (parsed.finish_reason) lastFinishReason = parsed.finish_reason;
                  if (parsed.done && lastFinishReason) {
                    lastFinishReason = parsed.finish_reason ?? lastFinishReason;
                  }
                }
              }
            }

            // Send done if not already sent via early-close
            if (!streamClosed) {
              if (receivedExplicitTermination) {
                // Normal close — stream properly terminated with explicit done
                streamClosed = true;
                clearInterval(keepaliveTimer);
                try {
                  const finalChunk = formatStreamChunk(id, providerModel, {
                    done: true,
                    finish_reason: lastFinishReason,
                    ...(totalUsage ? { usage: totalUsage } : {}),
                  });
                  controller.enqueue(textEncoder.encode(finalChunk));
                  controller.enqueue(textEncoder.encode(formatStreamDone()));
                  controller.close();
                } catch {
                  // Controller already closed — ignore
                }
              } else if (!contentEnqueued && retryContext && retriesRemaining > 0) {
                // Abnormal close with no content sent — transparent retry.
                // Provider stream closed before emitting any tokens.
                // Re-fetch and continue without the client ever knowing.
                console.log(`[STREAM-DIAG] ${id} buffer on close: ${JSON.stringify(buffer.slice(0, 200))}`);
                retriesRemaining--;
                console.log(`[STREAM-RETRY] ${id} 0-token stream error, retrying (${String(retriesRemaining)} left) at ${String(Math.round(performance.now() - start))}ms`);
                try { await currentReader.cancel(); } catch { /* ignore */ }

                // Reset stream state for the retry
                buffer = "";
                totalUsage = undefined;
                lastFinishReason = undefined;
                receivedExplicitTermination = false;
                responseStatus = 200;
                contentEnqueued = false;

                if ("resetStreamState" in adapter && typeof adapter.resetStreamState === "function") {
                  (adapter.resetStreamState as () => void)();
                }

                try {
                  // Use abortController.signal so external cancellation propagates.
                  // The original timeout already fired, so add a fresh timeout.
                  const retryTimeout = setTimeout(() => { retryContext.abortController.abort(); }, retryContext.timeout);
                  let retryResponse: Response;
                  try {
                    retryResponse = await retryContext.fetchFn(retryContext.requestUrl, {
                      method: "POST",
                      headers: retryContext.requestHeaders,
                      body: retryContext.requestBody,
                      signal: retryContext.abortController.signal,
                    });
                  } finally {
                    clearTimeout(retryTimeout);
                  }

                  if (!retryResponse.ok || !retryResponse.body) {
                    // Retry fetch failed — fall through to error
                    console.log(`[STREAM-RETRY] ${id} retry fetch failed: status=${String(retryResponse.status)}`);
                  } else {
                    currentReader = retryResponse.body.getReader();
                    void pump();
                    return;
                  }
                } catch (retryErr) {
                  // Retry fetch threw — fall through to error
                  const retryMsg = retryErr instanceof Error ? retryErr.message : "Retry fetch error";
                  console.log(`[STREAM-RETRY] ${id} retry fetch threw: ${retryMsg}`);
                }
                // Retry failed or exhausted — fall through to error chunk
                streamClosed = true;
                clearInterval(keepaliveTimer);
                responseStatus = 502;
                try {
                  const errorChunk = formatStreamChunk(id, providerModel, {
                    done: true,
                    finish_reason: "error",
                    content: "⚠ Stream ended unexpectedly. The provider closed the connection without completing the response. Please retry.",
                    error: {
                      code: "stream_error",
                      message: "Provider stream closed without sending finish_reason",
                    },
                  });
                  controller.enqueue(textEncoder.encode(errorChunk));
                  controller.enqueue(textEncoder.encode(formatStreamDone()));
                  controller.close();
                } catch {
                  // Controller already closed — ignore
                }
                console.log(`[STREAM-ERROR] ${id} Provider stream closed without explicit termination (retries exhausted) at ${String(Math.round(performance.now() - start))}ms`);
              } else {
                // Abnormal close — stream closed without explicit done chunk.
                // Content was already sent to client, can't retry cleanly.
                // Send error chunk so client receives fault signal.
                console.log(`[STREAM-DIAG] ${id} buffer on close (content=${String(contentEnqueued)}): ${JSON.stringify(buffer.slice(0, 200))}`);
                streamClosed = true;
                clearInterval(keepaliveTimer);
                responseStatus = 502;
                try {
                  const errorChunk = formatStreamChunk(id, providerModel, {
                    done: true,
                    finish_reason: "error",
                    content: "⚠ Stream ended unexpectedly. The provider closed the connection without completing the response. Please retry.",
                    error: {
                      code: "stream_error",
                      message: "Provider stream closed without sending finish_reason",
                    },
                  });
                  controller.enqueue(textEncoder.encode(errorChunk));
                  controller.enqueue(textEncoder.encode(formatStreamDone()));
                  controller.close();
                } catch {
                  // Controller already closed — ignore
                }
                console.log(`[STREAM-ERROR] ${id} Provider stream closed without explicit termination at ${String(Math.round(performance.now() - start))}ms`);
              }
            }

            this.emitLog({
              model,
              providerId,
              providerModel,
              adapterType,
              stream: isStream,
              status: responseStatus,
              durationMs: performance.now() - start,
              tokens: totalUsage,
              endpointId,
            });
          } catch (err) {
            if (!hadError) {
              hadError = true;
              streamClosed = true;
              clearInterval(keepaliveTimer);
              void currentReader.cancel();
              const correlationId = generateCorrelationId();
              const rawMsg = err instanceof Error ? err.message : "Stream error";
              console.error(`[STREAM-ERROR] ${id} rawMsg=${rawMsg} at ${String(Math.round(performance.now() - start))}ms`);
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
              try {
                controller.error(new Error("An internal error occurred. Please try again later."));
              } catch {
                // Controller already closed
              }
            } else {
              try { controller.error(err); } catch { /* already closed */ }
            }
          }
        };
        void pump();
      },
      cancel: async () => {
        if (streamClosed) return;
        streamClosed = true;
        clearInterval(keepaliveTimer);
        console.log(`[STREAM-CANCEL] ${id} downstream cancelled at ${String(Math.round(performance.now() - start))}ms`);
        try {
          await currentReader.cancel();
        } catch {
          // Ignore cancel errors
        }
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

      const delimiter = adapter.streamDelimiter ?? "\n\n";
      const parts = text.split(delimiter);
      for (const part of parts) {
        if (!part.trim()) continue;
        const parsed = adapter.parseSSEChunk(part);
        if (!parsed) continue;
        if (parsed.content) accumulated += parsed.content;
        if (parsed.usage) totalUsage = mergeUsage(totalUsage, parsed.usage, parsed.usageMode);
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
        const choice = choices[0] ?? {};
        const msg = choice.message as Record<string, unknown> | undefined;
        content = (msg?.content as string | null | undefined) ?? null;
        if (msg && Array.isArray(msg.tool_calls)) {
          toolCalls = msg.tool_calls as import("../provider/types.js").ToolCall[];
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
          promptTokens: (jsonUsage.prompt_tokens as number | undefined) ?? (jsonUsage.input_tokens as number | undefined) ?? 0,
          completionTokens: (jsonUsage.completion_tokens as number | undefined) ?? (jsonUsage.output_tokens as number | undefined) ?? 0,
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
    const timer = setTimeout(() => { abortController.abort(); }, this.timeout);

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
    super(`Request timed out after ${String(timeoutMs)}ms`);
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
  mode?: "incremental" | "total",
): { promptTokens: number; completionTokens: number } {
  if (!existing) return { ...incoming };
  if (mode === "total") return { ...incoming };
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
      if (d.function?.name && existing.function) existing.function.name = d.function.name;
      if (d.function?.arguments && existing.function) existing.function.arguments += d.function.arguments;
    }
  }
  return Array.from(map.values());
}
