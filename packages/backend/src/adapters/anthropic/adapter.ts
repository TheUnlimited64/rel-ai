import type { Message, ParsedChunk, ProviderError, ContentPart, ToolCallDelta } from "../../core/provider/types.js";
import type { ProviderAdapter } from "../../core/provider/adapter.js";

function contentToString(content: string | ContentPart[] | null): string {
  if (content === null) return "";
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

function messageToAnthropicContent(m: Message): Array<AnthropicContentBlock> | string {
  if (m.role === "tool") {
    return [
      { type: "tool_result" as const, tool_use_id: m.tool_call_id ?? "", content: typeof m.content === "string" ? m.content : contentToString(m.content) },
    ];
  }
  if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
    const blocks: Array<AnthropicContentBlock> = [];
    if (m.content && typeof m.content === "string" && m.content.length > 0) {
      blocks.push({ type: "text", text: m.content });
    }
    for (const tc of m.tool_calls) {
      let inputJson: unknown = {};
      try {
        inputJson = JSON.parse(tc.function?.arguments ?? "{}");
      } catch { /* keep empty */ }
      blocks.push({
        type: "tool_use",
        id: tc.id ?? "",
        name: tc.function?.name ?? "",
        input: inputJson,
      });
    }
    return blocks;
  }
  return contentToString(m.content);
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly type = "anthropic";

  private toolCallIndex = 0;
  private currentToolCalls = new Map<number, { id: string; name: string; arguments: string }>();

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown } {
    const { model, messages, stream, overrides } = params;

    if (!overrides?.apiKey || typeof overrides.apiKey !== "string" || overrides.apiKey.trim() === "") {
      throw new Error("Anthropic API key is required");
    }

    const apiKey = overrides.apiKey;
    const baseUrl = (overrides.baseUrl as string | undefined) ?? "https://api.anthropic.com";

    const systemMessage = messages
      .filter((m) => m.role === "system")
      .map((m) => contentToString(m.content))
      .join("\n");

    const nonSystemMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: messageToAnthropicContent(m) }));

    const max_tokens = (overrides.max_tokens as number | undefined) ?? 4096;

    const restOverrides = { ...overrides } as Record<string, unknown>;
    delete restOverrides.baseUrl;
    delete restOverrides.max_tokens;
    delete restOverrides.apiKey;

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
        "x-api-key": apiKey,
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
        result = { ...result, ...parsed };
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
      json = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return null;
    }

    switch (eventType) {
      case "message_start": {
        this.toolCallIndex = 0;
        this.currentToolCalls.clear();
        const usage = (json as { message?: { usage?: { input_tokens: number; output_tokens: number } } }).message?.usage;
        return {
          done: false,
          usage: usage
            ? { promptTokens: usage.input_tokens, completionTokens: usage.output_tokens }
            : undefined,
        };
      }
      case "content_block_start": {
        const contentBlock = (json as { content_block?: { type?: string; id?: string; name?: string } }).content_block;
        if (contentBlock?.type === "tool_use") {
          this.currentToolCalls.set(this.toolCallIndex, {
            id: contentBlock.id ?? "",
            name: contentBlock.name ?? "",
            arguments: "",
          });
          const delta: ToolCallDelta = {
            index: this.toolCallIndex,
            id: contentBlock.id,
            type: "function",
            function: { name: contentBlock.name, arguments: "" },
          };
          this.toolCallIndex++;
          return { tool_calls: [delta], done: false };
        }
        return null;
      }
      case "content_block_delta": {
        const delta = (json as { delta?: { type?: string; text?: string; thinking?: string; partial_json?: string }; index?: number }).delta;
        if (!delta) return null;

        if (delta.type === "text_delta") {
          return { content: delta.text, done: false };
        }
        if (delta.type === "thinking_delta") {
          return { thinking: delta.thinking, done: false };
        }
        if (delta.type === "input_json_delta") {
          const idx = (json as { index?: number }).index ?? 0;
          const existing = this.currentToolCalls.get(idx);
          if (existing) {
            existing.arguments += delta.partial_json ?? "";
            const tcDelta: ToolCallDelta = {
              index: idx,
              function: { arguments: delta.partial_json ?? "" },
            };
            return { tool_calls: [tcDelta], done: false };
          }
        }
        return null;
      }
      case "message_delta": {
        const delta = (json as { delta?: { stop_reason?: string }; usage?: { output_tokens?: number } }).delta;
        const usage = (json as { usage?: { output_tokens?: number } }).usage;
        const finishReason = delta?.stop_reason === "tool_use" ? "tool_calls"
          : delta?.stop_reason === "end_turn" ? "stop"
          : undefined;
        return {
          done: false,
          finish_reason: finishReason,
          usage: usage?.output_tokens !== undefined
            ? { promptTokens: 0, completionTokens: usage.output_tokens }
            : undefined,
        };
      }
      case "content_block_stop":
        return null;
      case "message_stop":
        this.currentToolCalls.clear();
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
