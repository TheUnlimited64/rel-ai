import type { ProviderAdapter } from "../../core/provider/adapter.js";
import type { Message, ParsedChunk, ProviderError } from "../../core/provider/types.js";
import { parseOpenAISSE, parseOpenAIError, isOpenAIRateLimitError } from "../../core/proxy/sse-utils.js";

/**
 * PassthroughAdapter — forwards requests to any OpenAI-compatible API endpoint.
 *
 * Used as the default "custom" adapter. Messages pass through without
 * transformation; SSE parsing assumes the upstream speaks the OpenAI
 * chat-completions streaming protocol.
 */
export class PassthroughAdapter implements ProviderAdapter {
  readonly type = "custom";

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown } {
    const { model, messages, stream, overrides } = params;
    const baseUrl = (overrides?.baseUrl as string) ?? "";
    const apiKey = (overrides?.apiKey as string) ?? "";

    if (!baseUrl) {
      throw new Error("PassthroughAdapter: baseUrl is required (pass via overrides.baseUrl)");
    }

    // Strip internal keys before forwarding
    const { apiKey: _a, baseUrl: _b, ...restOverrides } = overrides ?? ({} as Record<string, unknown>);

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

  parseSSEChunk(chunk: string): ParsedChunk | null {
    return parseOpenAISSE(chunk);
  }

  async parseError(response: Response): Promise<ProviderError> {
    return parseOpenAIError(response);
  }

  isRateLimitError(error: ProviderError): boolean {
    return isOpenAIRateLimitError(error);
  }
}
