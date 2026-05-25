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
