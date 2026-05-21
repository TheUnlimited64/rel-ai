import type { ProviderAdapter } from "../../core/provider/adapter.js";
import type { Message, ParsedChunk, ProviderError, TokenUsage } from "../../core/provider/types.js";

export class OpenAIAdapter implements ProviderAdapter {
  readonly type = "openai";

  constructor(
    private apiKey: string,
    private baseUrl: string,
  ) {}

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown } {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      stream: params.stream,
      ...params.overrides,
    };

    return {
      url: `${this.baseUrl}/chat/completions`,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    };
  }

  parseSSEChunk(chunk: string): ParsedChunk | null {
    let content: string | undefined;
    let thinking: string | undefined;
    let done = false;
    let usage: TokenUsage | undefined;

    const lines = chunk.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();

      if (data === "[DONE]") {
        done = true;
        continue;
      }

      if (!data) continue;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
      if (choices && choices.length > 0) {
        const delta = choices[0]!.delta as Record<string, unknown> | undefined;
        if (delta) {
          if (typeof delta.content === "string") {
            content = (content ?? "") + delta.content;
          }
          if (typeof delta.reasoning_content === "string") {
            thinking = (thinking ?? "") + delta.reasoning_content;
          }
        }
      }

      if (parsed.usage && typeof parsed.usage === "object") {
        const u = parsed.usage as Record<string, unknown>;
        usage = {
          promptTokens: (u.prompt_tokens as number) ?? 0,
          completionTokens: (u.completion_tokens as number) ?? 0,
        };
      }
    }

    if (!content && !thinking && !done && !usage) {
      return null;
    }

    return {
      ...(content !== undefined ? { content } : {}),
      ...(thinking !== undefined ? { thinking } : {}),
      done,
      ...(usage !== undefined ? { usage } : {}),
    };
  }

  async parseError(response: Response): Promise<ProviderError> {
    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const error = (body.error ?? {}) as Record<string, unknown>;

    return {
      code: (error.code as string) ?? "UNKNOWN",
      message: (error.message as string) ?? "Unknown error",
      status: response.status,
      retryable: response.status >= 500 && response.status < 600,
    };
  }

  isRateLimitError(error: ProviderError): boolean {
    if (error.status === 429) return true;
    if (error.code.toLowerCase().includes("rate")) return true;
    return false;
  }
}
