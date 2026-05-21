export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
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
