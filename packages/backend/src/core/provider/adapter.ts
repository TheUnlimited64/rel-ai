import type { Message, ParsedChunk, ProviderError } from "./types.js";

export interface ProviderAdapter {
  readonly type: string;

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown };

  parseSSEChunk(chunk: string): ParsedChunk | null;

  parseError(response: Response): Promise<ProviderError>;

  isRateLimitError(error: ProviderError): boolean;
}
