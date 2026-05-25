import type { Message, ParsedChunk, ProviderError, TokenUsage, ContentPart } from "../../core/provider/types.js";
import type { ProviderAdapter } from "../../core/provider/adapter.js";

function contentToString(content: string | ContentPart[] | null): string {
  if (content === null) return "";
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export class CommandCodeAdapter implements ProviderAdapter {
  readonly type = "commandcode";

  constructor(
    private defaultApiKey?: string,
    private defaultBaseUrl?: string,
  ) {}

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown } {
    const apiKey = (params.overrides?.apiKey as string) ?? this.defaultApiKey ?? "";
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Command Code API key is required");
    }

    const baseUrl = (params.overrides?.baseUrl as string) ?? this.defaultBaseUrl ?? "https://api.commandcode.ai";

    const systemMessage = params.messages
      .filter((m) => m.role === "system")
      .map((m) => contentToString(m.content))
      .join("\n");

    const nonSystemMessages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: contentToString(m.content) }));

    const max_tokens = (params.overrides?.max_tokens as number | undefined) ?? 4096;

    const {
      apiKey: _a,
      baseUrl: _b,
      max_tokens: _m,
      ...restOverrides
    } = params.overrides ?? ({} as Record<string, unknown>);

    // CRITICAL: /alpha/generate requires stream:true — returns 400 for stream:false
    const body: Record<string, unknown> = {
      config: {
        workingDir: "/tmp",
        date: new Date().toISOString().split("T")[0],
        environment: "server",
        structure: [],
        isGitRepo: false,
        currentBranch: "",
        mainBranch: "",
        gitStatus: "",
        recentCommits: [],
      },
      memory: "",
      taste: "",
      skills: null,
      permissionMode: "standard",
      params: {
        model: params.model,
        messages: nonSystemMessages,
        tools: [],
        system: systemMessage || "",
        max_tokens,
        stream: true,
        ...restOverrides,
      },
    };

    return {
      url: `${baseUrl}/alpha/generate`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "x-command-code-version": "0.24.1",
        "x-cli-environment": "production",
      },
      body,
    };
  }

  parseSSEChunk(chunk: string): ParsedChunk | null {
    // LDJSON format: bare JSON lines (NOT SSE with data: prefix)
    // Also handle data:-prefixed lines as fallback
    const lines = chunk.split("\n");
    let content: string | undefined;
    let thinking: string | undefined;
    let done = false;
    let usage: TokenUsage | undefined;

    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("data:")) {
        trimmed = trimmed.slice(5).trim();
      }
      if (!trimmed) continue;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }

      switch (parsed.type) {
        case "text-delta":
          content = (content ?? "") + ((parsed.text as string) ?? "");
          break;
        case "reasoning-delta":
          thinking = (thinking ?? "") + ((parsed.text as string) ?? "");
          break;
        case "finish": {
          done = true;
          const tu = parsed.totalUsage as Record<string, unknown> | undefined;
          if (tu) {
            usage = {
              promptTokens: (tu.inputTokens as number) ?? 0,
              completionTokens: (tu.outputTokens as number) ?? 0,
            };
          }
          break;
        }
        case "error": {
          const errObj = parsed.error as Record<string, unknown> | undefined;
          const errMsg = errObj?.message ?? String(parsed.error) ?? "Stream error";
          throw new Error(typeof errMsg === "string" ? errMsg : "Stream error");
        }
        default:
          break;
      }
    }

    if (content === undefined && thinking === undefined && !done && usage === undefined) {
      return null;
    }

    return {
      ...(content !== undefined ? { content } : {}),
      ...(thinking !== undefined ? { thinking } : {}),
      done,
      ...(usage !== undefined ? { usage } : {}),
    };
  }

  async parseError(response: Response): Promise<ProviderError> {
    let code = "unknown";
    let message = "Unknown error";

    try {
      const body = await response.json() as {
        error?: { code?: string; message?: string; status?: number };
      };
      if (body.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      // use defaults
    }

    const status = response.status;
    const retryable = status === 429 || status >= 500;

    return { code, message, status, retryable };
  }

  isRateLimitError(error: ProviderError): boolean {
    return error.status === 429;
  }
}
