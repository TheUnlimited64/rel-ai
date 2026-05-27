export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export type ToolCallFunction = {
  name: string;
  arguments: string;
};

export type ToolCall = {
  index?: number;
  id?: string;
  type?: "function";
  function?: ToolCallFunction;
};

export type ToolCallDelta = {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
};

export type Message = {
  role: "system" | "user" | "assistant" | "tool" | "developer";
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  reasoning_content?: string;
};

export type ParsedChunk = {
  content?: string;
  thinking?: string;
  tool_calls?: ToolCallDelta[];
  finish_reason?: string;
  done: boolean;
  usage?: TokenUsage;
  usageMode?: UsageMode;
};

export type ProviderError = {
  code: string;
  message: string;
  status: number;
  retryable: boolean;
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
};

/**
 * How the usage values in a ParsedChunk should be accumulated.
 * - "incremental" (default): values represent deltas to add to running totals.
 *   Used by providers like Anthropic that emit prompt tokens once in message_start
 *   and output token deltas in message_delta.
 * - "total": values represent the authoritative running totals at this point.
 *   Used by providers like CommandCode that emit cumulative totals in a finish event.
 *   The handler should replace its accumulated usage with the latest total rather
 *   than adding to it.
 */
export type UsageMode = "incremental" | "total";
