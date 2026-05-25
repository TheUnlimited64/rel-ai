import type { Message, ParsedChunk, ProviderError, TokenUsage, ContentPart } from "../../core/provider/types.js";
import type { ProviderAdapter, TestConnectionResult } from "../../core/provider/adapter.js";
import { debugLog } from "../../core/proxy/debug-logger.js";

function contentToString(content: string | ContentPart[] | null): string {
  if (content === null) return "";
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

type OpenAITool = {
  type?: string;
  function?: { name?: string; description?: string; parameters?: Record<string, unknown> };
};

function convertTools(tools?: OpenAITool[]): unknown[] {
  if (!tools || !Array.isArray(tools)) return [];
  return tools.map((tool) => ({
    type: "function",
    name: tool.function?.name ?? "",
    description: tool.function?.description ?? "",
    input_schema: tool.function?.parameters ?? {},
  }));
}

export class CommandCodeAdapter implements ProviderAdapter {
  readonly type = "commandcode";
  readonly streamDelimiter = "\n";

  constructor(
    private defaultApiKey?: string,
    private defaultBaseUrl?: string,
  ) {}

  /**
   * Convert OpenAI messages to CommandCode format.
   * - system/developer → extracted to `system` string
   * - user → `{ role: "user", content }` (content as-is)
   * - assistant → `{ role: "assistant", content: [{type:"text",...},{type:"tool-call",...}] }`
   * - tool → `{ role: "tool", content: [{type:"tool-result",...}] }`
   *
   * Based on OmniRoute's convertMessages() in open-sse/executors/commandCode.ts
   */
  private convertMessages(messages: Message[]): { system: string; messages: unknown[] } {
    const callIds = new Set<string>();
    const resultIds = new Set<string>();
    for (const m of messages) {
      if (m.role === "assistant" && m.tool_calls) {
        for (const tc of m.tool_calls) {
          if (tc.id) callIds.add(tc.id);
        }
      } else if (m.role === "tool" && m.tool_call_id) {
        resultIds.add(m.tool_call_id);
      }
    }
    const pairedIds = new Set([...callIds].filter((id) => resultIds.has(id)));

    const systemParts: string[] = [];
    const out: unknown[] = [];

    for (const m of messages) {
      if (m.role === "system" || m.role === "developer") {
        const text = contentToString(m.content);
        if (text) systemParts.push(text);
        continue;
      }

      if (m.role === "user") {
        out.push({ role: "user", content: contentToString(m.content) || "" });
        continue;
      }

      if (m.role === "assistant") {
        const parts: unknown[] = [];
        const text = contentToString(m.content);
        if (text) parts.push({ type: "text", text });

        if (m.tool_calls) {
          for (const tc of m.tool_calls) {
            if (!tc.id || !pairedIds.has(tc.id)) continue;
            const fn = tc.function;
            let input: Record<string, unknown> = {};
            if (fn?.arguments) {
              try {
                input = JSON.parse(fn.arguments) as Record<string, unknown>;
              } catch {
                input = {};
              }
            }
            parts.push({
              type: "tool-call",
              toolCallId: tc.id,
              toolName: fn?.name ?? "",
              input,
            });
          }
        }

        if (parts.length > 0) out.push({ role: "assistant", content: parts });
        continue;
      }

      if (m.role === "tool") {
        if (!m.tool_call_id || !pairedIds.has(m.tool_call_id)) continue;
        out.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: m.tool_call_id,
              toolName: m.name ?? "",
              output: { type: "text", value: contentToString(m.content) },
            },
          ],
        });
      }
    }

    return { system: systemParts.join("\n\n"), messages: out };
  }

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

    const sessionId = crypto.randomUUID();

    const { system: systemMessage, messages: nonSystemMessages } = this.convertMessages(params.messages);

    const max_tokens = (params.overrides?.max_tokens as number | undefined) ?? 4096;

    const overrides = params.overrides ?? ({} as Record<string, unknown>);

    // Extract known params from overrides — DO NOT spread restOverrides
    // CC silently rejects requests with unknown params (returns 200 + {success:false})
    const rawTools = overrides.tools as OpenAITool[] | undefined;
    const temperature = overrides.temperature as number | undefined;
    const stop = overrides.stop as string | string[] | undefined;

    // Convert OpenAI tools format to CommandCode format
    // OpenAI: { type: "function", function: { name, description, parameters } }
    // CC:     { type: "function", name, description, input_schema }
    const tools = convertTools(rawTools);

    // CRITICAL: /alpha/generate requires stream:true — returns 400 for stream:false
    // CRITICAL: Only send CC-recognized params. Unknown keys cause silent rejection.
    // NOTE: Do NOT send tool_choice — CC doesn't support it (OmniRoute/patlux omit it)
    const body: Record<string, unknown> = {
      config: {
        workingDir: "/workspace",
        date: new Date().toISOString().split("T")[0],
        environment: "external",
        structure: [],
        isGitRepo: false,
        currentBranch: "",
        mainBranch: "",
        gitStatus: "",
        recentCommits: [],
      },
      memory: "",
      taste: "",
      skills: "",
      permissionMode: "standard",
      params: {
        model: params.model,
        messages: nonSystemMessages,
        system: systemMessage || "",
        max_tokens,
        stream: true,
        tools,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(stop !== undefined ? { stop } : {}),
      },
    };

    const generatePath = "/alpha/generate";
    const url = baseUrl.endsWith(generatePath) ? baseUrl : `${baseUrl}${generatePath}`;
    debugLog("cc-createRequest", { baseUrl, finalUrl: url, model: params.model, toolsCount: tools.length });
    debugLog("cc-request-body", { bodyPreview: JSON.stringify(body).slice(0, 1000) });

    return {
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "x-command-code-version": "0.24.1",
        "x-cli-environment": "external",
        "x-project-slug": "llmpack",
        "x-taste-learning": "false",
        "x-co-flag": "false",
        "x-session-id": sessionId,
      },
      body,
    };
  }

  parseSSEChunk(chunk: string): ParsedChunk | null {
    debugLog("cc-parseSSEChunk-input", { chunkLen: chunk.length, preview: chunk.slice(0, 500) });
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

      // CC can return {success:false, error:{...}} as a 200 response chunk
      if (parsed.success === false) {
        const errObj = parsed.error as Record<string, unknown> | undefined;
        const errMsg = errObj?.message ?? String(parsed.error) ?? "CC request rejected";
        throw new Error(typeof errMsg === "string" ? errMsg : "CC request rejected");
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
      debugLog("cc-parseSSEChunk-result", { result: "null" });
      return null;
    }

    const result = {
      ...(content !== undefined ? { content: content.slice(0, 100) } : {}),
      ...(thinking !== undefined ? { thinking: thinking.slice(0, 100) } : {}),
      done,
      ...(usage !== undefined ? { usage } : {}),
    };
    debugLog("cc-parseSSEChunk-result", result);
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
      const text = await response.text();
      debugLog("cc-parseError", { status: response.status, body: text.slice(0, 500) });
      try {
        const body = JSON.parse(text) as {
          error?: { code?: string; message?: string; status?: number };
        };
        if (body.error) {
          code = body.error.code ?? code;
          message = body.error.message ?? message;
        }
      } catch {
        // Response isn't JSON — use raw text (truncated) as the error message
        if (text.trim()) {
          message = text.trim().slice(0, 500);
        }
      }
    } catch {
      // Can't read body at all — use defaults
    }

    const status = response.status;
    const retryable = status === 429 || status >= 500;

    return { code, message, status, retryable };
  }

  isRateLimitError(error: ProviderError): boolean {
    return error.status === 429;
  }

  async testConnection(baseUrl: string, apiKey: string): Promise<TestConnectionResult> {
    const generatePath = "/alpha/generate";
    const url = baseUrl.endsWith(generatePath) ? baseUrl : `${baseUrl.replace(/\/$/, "")}${generatePath}`;
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "x-command-code-version": "0.24.1",
        "x-cli-environment": "external",
          "x-project-slug": "llmpack",
          "x-taste-learning": "false",
          "x-co-flag": "false",
          "x-session-id": crypto.randomUUID(),
        },
        body: JSON.stringify({
          config: { workingDir: "/workspace", date: new Date().toISOString().split("T")[0], environment: "external", structure: [], isGitRepo: false, currentBranch: "", mainBranch: "", gitStatus: "", recentCommits: [] },
          memory: "",
          taste: "",
      skills: "",
          permissionMode: "standard",
          params: { model: "deepseek/deepseek-v4-flash", messages: [{ role: "user", content: "hi" }], tools: [], system: "", max_tokens: 1, stream: true },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const latencyMs = Date.now() - start;
      if (response.ok || response.status === 400) {
        return { success: true, latencyMs };
      }
      const errBody = await response.text().catch(() => "");
      return { success: false, error: `HTTP ${response.status}: ${errBody.slice(0, 200)}`, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - start;
      return { success: false, error: err instanceof Error ? err.message : "Unknown error", latencyMs };
    }
  }
}
