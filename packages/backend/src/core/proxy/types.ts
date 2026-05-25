import type { Message, TokenUsage } from "../provider/types.js";

export type ProxyRequest = {
  model: string;
  messages: Message[];
  stream: boolean;
  overrides?: Record<string, unknown>;
  endpointId?: string;
  requestId?: string;
};

export type ProxyResult =
  | { ok: true; status: number; body: ReadableStream<Uint8Array> | unknown; headers: Record<string, string> }
  | { ok: false; status: number; error: ProxyError };

export type ProxyError = {
  code: string;
  message: string;
  type: string;
  correlationId?: string;
};

export type RequestLogData = {
  model: string;
  providerId: string;
  providerModel: string;
  adapterType: string;
  stream: boolean;
  status: number;
  durationMs: number;
  tokens?: TokenUsage;
  error?: string;
  endpointId?: string;
  correlationId?: string;
  providerErrorCode?: string;
};
