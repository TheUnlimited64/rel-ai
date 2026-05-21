import type { Message, ParsedChunk, ProviderError } from "../../core/provider/types.js";
import type { ProviderAdapter } from "../../core/provider/adapter.js";

export class AnthropicAdapter implements ProviderAdapter {
  readonly type = "anthropic";

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown } {
    const { model, messages, stream, overrides } = params;
    const baseUrl = (overrides?.baseUrl as string) ?? "https://api.anthropic.com";

    const systemMessage = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const nonSystemMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const max_tokens = (overrides?.max_tokens as number | undefined) ?? 4096;

    const { baseUrl: _b, max_tokens: _m, apiKey: _a, ...restOverrides } = overrides ?? ({} as Record<string, unknown>);

    const body: Record<string, unknown> = {
      model,
      messages: nonSystemMessages,
      max_tokens,
      stream,
      ...(systemMessage ? { system: systemMessage } : {}),
      ...restOverrides,
    };

    return {
      url: `${baseUrl}/v1/messages`,
      headers: {
        "x-api-key": overrides?.apiKey as string,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body,
    };
  }

  parseSSEChunk(chunk: string): ParsedChunk | null {
    const events = chunk.split("\n\n").filter((e) => e.trim().length > 0);

    let result: ParsedChunk | null = null;

    for (const event of events) {
      const parsed = this._parseSingleEvent(event);
      if (parsed !== null) {
        // Merge: later events in same chunk override earlier
        result = { ...result, ...parsed } as ParsedChunk;
      }
    }

    return result;
  }

  private _parseSingleEvent(event: string): ParsedChunk | null {
    let eventType = "";
    let data = "";

    for (const line of event.split("\n")) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data = line.slice(5).trim();
      }
    }

    if (!eventType || !data) return null;

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(data);
    } catch {
      return null;
    }

    switch (eventType) {
      case "message_start": {
        const usage = (json as { message?: { usage?: { input_tokens: number; output_tokens: number } } }).message?.usage;
        return {
          done: false,
          usage: usage
            ? { promptTokens: usage.input_tokens, completionTokens: usage.output_tokens }
            : undefined,
        };
      }
      case "content_block_delta": {
        const delta = (json as { delta?: { type?: string; text?: string; thinking?: string } }).delta;
        if (!delta) return null;

        if (delta.type === "text_delta") {
          return { content: delta.text, done: false };
        }
        if (delta.type === "thinking_delta") {
          return { thinking: delta.thinking, done: false };
        }
        return null;
      }
      case "message_delta": {
        const delta = (json as { delta?: { stop_reason?: string }; usage?: { output_tokens?: number } }).delta;
        const usage = (json as { usage?: { output_tokens?: number } }).usage;
        return {
          done: false,
          usage: usage?.output_tokens !== undefined
            ? { promptTokens: 0, completionTokens: usage.output_tokens }
            : undefined,
        };
      }
      case "message_stop":
        return { done: true };
      default:
        return null;
    }
  }

  async parseError(response: Response): Promise<ProviderError> {
    let code = "unknown";
    let message = "Unknown error";

    try {
      const body = await response.json() as { type?: string; error?: { type?: string; message?: string } };
      if (body.error) {
        code = body.error.type ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      // use defaults
    }

    const status = response.status;
    const retryable = status === 429 || status >= 500;

    return { code, message, status, retryable };
  }

  isRateLimitError(error: ProviderError): boolean {
    return error.status === 429 || error.code === "rate_limit_error";
  }
}
