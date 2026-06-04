import type { ProviderAdapter } from "../../core/provider/adapter.js";
import type { Message, ParsedChunk, ProviderError } from "../../core/provider/types.js";
import { parseOpenAISSE, parseOpenAIError, isOpenAIRateLimitError } from "../../core/proxy/sse-utils.js";

/**
 * CustomAdapterTemplate — starting point for implementing a custom provider adapter.
 *
 * Copy this file, rename the class, and fill in each method to match your
 * provider's API contract. Register the finished adapter with the
 * AdapterRegistry so the ProxyHandler can use it.
 *
 * @see ../../core/provider/adapter.ts — ProviderAdapter interface
 * @see GUIDE.md — step-by-step implementation guide
 */
export class CustomAdapterTemplate implements ProviderAdapter {
  readonly type = "custom";

  /**
   * Build the HTTP request that will be sent to the provider.
   *
   * @param params.model       - Provider model identifier (e.g. "my-model-v2")
   * @param params.messages    - Conversation messages in unified format
   * @param params.stream      - Whether streaming is requested
   * @param params.overrides   - Extra key/value pairs forwarded from the client
   * @returns Object with `url`, `headers`, and `body` for fetch()
   */
  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown } {
    const { model, messages, stream, overrides } = params;
    const baseUrl = (overrides?.baseUrl as string | undefined) ?? "";
    const apiKey = (overrides?.apiKey as string | undefined) ?? "";

    if (!baseUrl) {
      throw new Error("CustomAdapterTemplate: baseUrl is required (pass via overrides.baseUrl)");
    }

    // Strip internal keys before forwarding to provider body
    const restOverrides = { ...(overrides ?? {}) } as Record<string, unknown>;
    delete restOverrides.apiKey;
    delete restOverrides.baseUrl;

    const body: Record<string, unknown> = {
      model,
      messages,
      stream,
      ...restOverrides,
    };

    return {
      url: `${baseUrl}/chat/completions`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    };
  }

  /**
   * Parse a single SSE chunk received from the provider.
   *
   * @param chunk - Raw SSE chunk string (may contain multiple `data:` lines)
   * @returns ParsedChunk with content/thinking/done/usage, or null if nothing meaningful
   *
   * OpenAI-style chunks look like:
   *   data: {"choices":[{"delta":{"content":"Hi"}}]}
   *   data: [DONE]
   *
   * Anthropic-style chunks look like:
   *   event: content_block_delta
   *   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}
   *
   * Adapt this method to match your provider's SSE wire format.
   */
  parseSSEChunk(chunk: string): ParsedChunk | null {
    // Default: parse as OpenAI-style SSE. Replace with your provider's format.
    return parseOpenAISSE(chunk);
  }

  /**
   * Parse an error response from the provider.
   *
   * @param response - The failed fetch Response object
   * @returns ProviderError with code, message, status, and retryable flag
   */
  async parseError(response: Response): Promise<ProviderError> {
    return parseOpenAIError(response);
  }

  /**
   * Detect whether a ProviderError represents a rate-limit condition.
   *
   * @param error - The parsed ProviderError
   * @returns true if this is a rate-limit error
   */
  isRateLimitError(error: ProviderError): boolean {
    return isOpenAIRateLimitError(error);
  }
}
