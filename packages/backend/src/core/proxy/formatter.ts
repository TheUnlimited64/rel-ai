import type { ParsedChunk, TokenUsage } from "../provider/types.js";

export type OpenAIStreamChunk = {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Record<string, unknown>;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type OpenAICompletion = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string | null; tool_calls?: import("../provider/types.js").ToolCall[] };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export function formatStreamChunk(
  id: string,
  model: string,
  chunk: ParsedChunk,
): string {
  const delta: Record<string, unknown> = {};
  if (chunk.content !== undefined) {
    delta.content = chunk.content;
  }
  if (chunk.thinking !== undefined) {
    delta.reasoning_content = chunk.thinking;
  }
  if (chunk.tool_calls !== undefined) {
    delta.tool_calls = chunk.tool_calls;
  }

  const finishReason = chunk.done
    ? (chunk.finish_reason ?? "stop")
    : (chunk.finish_reason ?? null);

  const obj: OpenAIStreamChunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
    ...(chunk.usage ? { usage: toOpenAIUsage(chunk.usage) } : {}),
  };

  return `data: ${JSON.stringify(obj)}\n\n`;
}

export function formatStreamDone(): string {
  return "data: [DONE]\n\n";
}

export function formatCompletion(
  id: string,
  model: string,
  content: string | null,
  usage: TokenUsage,
  toolCalls?: import("../provider/types.js").ToolCall[],
  finishReason?: string,
): string {
  const message: { role: string; content: string | null; tool_calls?: import("../provider/types.js").ToolCall[] } = {
    role: "assistant",
    content,
  };
  if (toolCalls && toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }

  const obj: OpenAICompletion = {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: finishReason ?? (toolCalls && toolCalls.length > 0 ? "tool_calls" : "stop"),
      },
    ],
    usage: toOpenAIUsage(usage),
  };

  return JSON.stringify(obj);
}

export function generateId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `chatcmpl-${hex}`;
}

function toOpenAIUsage(usage: TokenUsage): {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
} {
  return {
    prompt_tokens: usage.promptTokens,
    completion_tokens: usage.completionTokens,
    total_tokens: usage.promptTokens + usage.completionTokens,
  };
}
