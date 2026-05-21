import type { ParsedChunk, TokenUsage } from "../provider/types.js";

export type OpenAIStreamChunk = {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Record<string, string>;
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
    message: { role: string; content: string };
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
  const delta: Record<string, string> = {};
  if (chunk.content !== undefined) {
    delta.content = chunk.content;
  }
  if (chunk.thinking !== undefined) {
    delta.reasoning_content = chunk.thinking;
  }

  const obj: OpenAIStreamChunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: chunk.done ? "stop" : null,
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
  content: string,
  usage: TokenUsage,
): string {
  const obj: OpenAICompletion = {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
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
