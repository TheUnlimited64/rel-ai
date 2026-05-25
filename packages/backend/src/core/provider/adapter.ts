import type { Message, ParsedChunk, ProviderError } from "./types.js";

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  latencyMs: number;
}

export interface ProviderAdapter {
  readonly type: string;

  readonly streamDelimiter?: string;

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown };

  parseSSEChunk(chunk: string): ParsedChunk | null;

  parseError(response: Response): Promise<ProviderError>;

  isRateLimitError(error: ProviderError): boolean;

  testConnection?(baseUrl: string, apiKey: string): Promise<TestConnectionResult>;
}
