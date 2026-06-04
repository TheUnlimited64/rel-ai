import type { ProviderAdapter } from "../../core/provider/adapter.js";
import type { Message, ParsedChunk, ProviderError } from "../../core/provider/types.js";
import { parseOpenAISSE, parseOpenAIError, isOpenAIRateLimitError } from "../../core/proxy/sse-utils.js";

export class OpenAIAdapter implements ProviderAdapter {
  readonly type = "openai";

  constructor(
    private defaultApiKey?: string,
    private defaultBaseUrl?: string,
  ) {}

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown } {
    const apiKey = (params.overrides?.apiKey as string | undefined) ?? this.defaultApiKey ?? "";
    const baseUrl = (params.overrides?.baseUrl as string | undefined) ?? this.defaultBaseUrl ?? "https://api.openai.com";

    // Strip internal keys from overrides before passing to body
    const restOverrides = { ...(params.overrides ?? {}) } as Record<string, unknown>;
    delete restOverrides.apiKey;
    delete restOverrides.baseUrl;

    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      stream: params.stream,
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
