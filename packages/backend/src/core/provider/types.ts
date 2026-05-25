export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export type Message = {
  role: "system" | "user" | "assistant" | "tool" | "developer";
  content: string | ContentPart[] | null;
};

export type ParsedChunk = {
  content?: string;
  thinking?: string;
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
