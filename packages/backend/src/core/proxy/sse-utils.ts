import type { ParsedChunk, ProviderError, TokenUsage } from "../provider/types.js";

/**
 * Parse an SSE chunk that follows the OpenAI chat-completions streaming protocol.
 *
 * Shared by OpenAIAdapter and PassthroughAdapter to avoid duplication.
 */
export function parseOpenAISSE(chunk: string): ParsedChunk | null {
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

/**
 * Parse a non-2xx response following the OpenAI error shape.
 *
 * Shared by OpenAIAdapter and PassthroughAdapter.
 */
export async function parseOpenAIError(response: Response): Promise<ProviderError> {
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

/**
 * Detect rate-limit errors by HTTP status or error code.
 *
 * Checks both `status === 429` and whether the error code contains "rate".
 */
export function isOpenAIRateLimitError(error: ProviderError): boolean {
  if (error.status === 429) return true;
  if (error.code.toLowerCase().includes("rate")) return true;
  return false;
}
