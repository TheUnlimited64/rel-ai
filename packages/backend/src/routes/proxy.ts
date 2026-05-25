import { Hono } from "hono";
import type { ProxyHandler } from "../core/proxy/handler.js";
import type { RequestLogData } from "../core/proxy/types.js";
import type { DbClient } from "../db/connection.js";
import { validateEndpointToken } from "../core/auth/endpoint.js";
import { extractBearerToken } from "../core/auth/token.js";
import { endpointModels, models } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ProxyRequest } from "../core/proxy/types.js";

const ContentPartSchema: z.ZodType<import("../core/provider/types.js").ContentPart> = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string(), detail: z.enum(["auto", "low", "high"]).optional() }) }),
]);

const ToolCallFunctionSchema = z.object({
  name: z.string(),
  arguments: z.string(),
});

const ToolCallSchema = z.object({
  index: z.number().optional(),
  id: z.string().optional(),
  type: z.literal("function").optional(),
  function: ToolCallFunctionSchema.optional(),
});

const ChatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool", "developer"]),
        content: z.union([z.string(), z.array(ContentPartSchema), z.null()]),
        tool_calls: z.array(ToolCallSchema).optional(),
        tool_call_id: z.string().optional(),
        name: z.string().optional(),
        reasoning_content: z.string().optional(),
      }).passthrough(),
    )
    .min(1),
  stream: z.boolean().optional().default(true),
}).passthrough();

type EndpointRecord = Awaited<ReturnType<typeof validateEndpointToken>>;

export function createProxyRouter(db: DbClient, handler: ProxyHandler) {
  const router = new Hono<{
    Variables: { endpoint: NonNullable<EndpointRecord> };
  }>();

  // Middleware: validate endpoint + bearer token
  router.use("/:endpointPath/*", async (c, next) => {
    const endpointPath = c.req.param("endpointPath");
    const authHeader = c.req.header("Authorization");
    const token = extractBearerToken(authHeader);

    if (!authHeader) {
      return c.json(
        {
          error: {
            message: "Missing authorization",
            type: "auth_error",
            code: "unauthorized",
          },
        },
        401,
      );
    }

    if (!token) {
      return c.json(
        {
          error: {
            message: "Invalid authorization header",
            type: "auth_error",
            code: "unauthorized",
          },
        },
        401,
      );
    }

    const endpoint = await validateEndpointToken(db, endpointPath, token);
    if (!endpoint) {
      return c.json(
        {
          error: {
            message: "Invalid endpoint or token",
            type: "auth_error",
            code: "unauthorized",
          },
        },
        401,
      );
    }

    c.set("endpoint", endpoint);
    await next();
  });

  // POST /:endpointPath/chat/completions
  router.post("/:endpointPath/chat/completions", async (c) => {
    const endpoint = c.get("endpoint");

    // Parse body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: {
            message: "Invalid JSON body",
            type: "invalid_request_error",
            code: "invalid_json",
          },
        },
        400,
      );
    }

    // Validate with Zod
    console.log("[PROXY DEBUG] Request body:", JSON.stringify(body, null, 2));
    const parsed = ChatCompletionSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[PROXY DEBUG] Zod validation failed:", JSON.stringify(parsed.error.issues, null, 2));
      const issues = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return c.json(
        {
          error: {
            message: "Invalid request body",
            type: "invalid_request_error",
            code: "validation_error",
            issues,
          },
        },
        400,
      );
    }

    const { model, messages, stream, ...overrides } = parsed.data;

    // Build proxy request
    const requestId = crypto.randomUUID();
    const proxyRequest: ProxyRequest = {
      model,
      messages,
      stream,
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      endpointId: endpoint.id,
      requestId,
      signal: c.req.raw.signal,
    };

    const result = await handler.handle(proxyRequest);

    if (!result.ok) {
      const status = result.status;
      const errorType =
        status === 404
          ? "not_found_error"
          : status === 504
            ? "timeout_error"
            : status === 502
              ? "provider_error"
              : "server_error";

      return c.json(
        {
          error: {
            message: result.error.message,
            type: errorType,
            code: result.error.code,
          },
        },
        status as 401 | 404 | 502 | 504,
      );
    }

    // Success response
    const responseHeaders: Record<string, string> = {
      "X-Request-Id": requestId,
      ...result.headers,
    };

    if (result.body instanceof ReadableStream) {
      return new Response(result.body, {
        status: result.status,
        headers: responseHeaders,
      });
    }

    // Non-stream: body is a JSON string from formatCompletion
    if (typeof result.body === "string") {
      return new Response(result.body, {
        status: result.status,
        headers: responseHeaders,
      });
    }

    return c.json(result.body, result.status as 200, responseHeaders);
  });

  // GET /:endpointPath/models
  router.get("/:endpointPath/models", async (c) => {
    const endpoint = c.get("endpoint");

    const rows = db
      .select({
        id: models.id,
        displayName: models.displayName,
        createdAt: models.createdAt,
      })
      .from(endpointModels)
      .innerJoin(models, eq(endpointModels.modelId, models.id))
      .where(eq(endpointModels.endpointId, endpoint.id))
      .all();

    const data = rows.map((row) => ({
      id: row.id,
      object: "model" as const,
      created: Math.floor(new Date(row.createdAt).getTime() / 1000),
      owned_by: "rel-ai",
    }));

    return c.json({
      object: "list",
      data,
    });
  });

  return router;
}
