import { http, HttpResponse, type HttpHandler } from "msw";
import type { ProviderResponse } from "@/features/providers/api";
import type {
  EndpointListResponse,
  EndpointCreateResponse,
} from "@/features/endpoints/api";

// ---- Default mock data ----

export const mockProvider: ProviderResponse = {
  id: "provider-1",
  name: "Test Provider",
  adapterType: "openai",
  baseUrl: "https://api.openai.com",
  maskedApiKey: "sk_****",
  enabled: true,
  config: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockProviderList: ProviderResponse[] = [mockProvider];

export const mockEndpoint: EndpointListResponse = {
  id: "endpoint-1",
  name: "Test EP",
  path: "test-ep",
  enabled: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  modelCount: 2,
  proxyBase: "http://localhost:3000",
};

export const mockEndpointList: EndpointListResponse[] = [mockEndpoint];

export const mockCreateProvider: ProviderResponse & { apiKeyRaw: string } = {
  ...mockProvider,
  id: "provider-new",
  name: "New Provider",
  apiKeyRaw: "sk-new-raw-key",
};

export const mockCreateEndpoint: EndpointCreateResponse = {
  id: "endpoint-new",
  name: "New EP",
  path: "new-ep",
  token: "tok_new",
  enabled: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  proxyBase: "http://localhost:3000",
};

// ---- tRPC response helper ----
// tRPC v11 HTTP response wraps data in { result: { data: ... } }
function trpcResponse(data: unknown) {
  return HttpResponse.json({ result: { data } });
}

function trpcError(code: number, message: string) {
  return HttpResponse.json(
    { error: { message, code: -32_000 } },
    { status: code },
  );
}

// ---- tRPC procedure handlers ----
// tRPC v11 uses POST to /api/trpc/<procedure> for mutations
// and GET to /api/trpc/<procedure>?input=... for queries (when batching)
// but also POST for queries. We handle both.

export const providersListHandler = (
  data: ProviderResponse[] = mockProviderList,
) =>
  http.get("/api/trpc/providers.list", () => trpcResponse(data));

export const providersGetHandler = (
  data: ProviderResponse = mockProvider,
) =>
  http.get("/api/trpc/providers.get", () => trpcResponse(data));

export const providersCreateHandler = (
  data: ProviderResponse & { apiKeyRaw: string } = mockCreateProvider,
) =>
  http.post("/api/trpc/providers.create", () => trpcResponse(data));

export const providersUpdateHandler = (
  data: ProviderResponse = mockProvider,
) =>
  http.post("/api/trpc/providers.update", () => trpcResponse(data));

export const providersDeleteHandler = () =>
  http.post("/api/trpc/providers.delete", () => trpcResponse(undefined));

export const endpointsListHandler = (
  data: EndpointListResponse[] = mockEndpointList,
) =>
  http.get("/api/trpc/endpoints.list", () => trpcResponse(data));

export const endpointsGetHandler = (
  data: EndpointListResponse = mockEndpoint,
) =>
  http.get("/api/trpc/endpoints.get", () => trpcResponse(data));

export const endpointsCreateHandler = (
  data: EndpointCreateResponse = mockCreateEndpoint,
) =>
  http.post("/api/trpc/endpoints.create", () => trpcResponse(data));

export const endpointsUpdateHandler = (
  data: EndpointListResponse = mockEndpoint,
) =>
  http.post("/api/trpc/endpoints.update", () => trpcResponse(data));

export const endpointsDeleteHandler = () =>
  http.post("/api/trpc/endpoints.delete", () => trpcResponse(undefined));

// ---- Error handlers ----

export const providersListErrorHandler = (
  status = 500,
  message = "Internal Server Error",
) =>
  http.get("/api/trpc/providers.list", () => trpcError(status, message));

export const providersGetErrorHandler = (
  status = 404,
  message = "NOT_FOUND",
) =>
  http.get("/api/trpc/providers.get", () => trpcError(status, message));

export const providersCreateErrorHandler = (
  status = 400,
  message = "Bad Request",
) =>
  http.post("/api/trpc/providers.create", () => trpcError(status, message));

export const endpointsListErrorHandler = (
  status = 500,
  message = "Internal Server Error",
) =>
  http.get("/api/trpc/endpoints.list", () => trpcError(status, message));

export const endpointsCreateErrorHandler = (
  status = 400,
  message = "Bad Request",
) =>
  http.post("/api/trpc/endpoints.create", () => trpcError(status, message));

// ---- Auth handlers (plain fetch, not tRPC) ----

export const authMeAuthenticatedHandler = () =>
  http.get("/api/auth/me", () =>
    HttpResponse.json({ authenticated: true }),
  );

export const authMeUnauthenticatedHandler = () =>
  http.get("/api/auth/me", () =>
    HttpResponse.json({ authenticated: false }, { status: 401 }),
  );

export const authLoginSuccessHandler = () =>
  http.post("/api/auth/login", () =>
    HttpResponse.json({ authenticated: true }),
  );

export const authLoginFailHandler = () =>
  http.post("/api/auth/login", () =>
    HttpResponse.json({ authenticated: false }, { status: 401 }),
  );

export const authLogoutHandler = () =>
  http.post("/api/auth/logout", () => HttpResponse.json({ ok: true }));

// ---- Combined default handlers ----

export const defaultHandlers: HttpHandler[] = [
  providersListHandler(),
  providersGetHandler(),
  providersCreateHandler(),
  providersUpdateHandler(),
  providersDeleteHandler(),
  endpointsListHandler(),
  endpointsGetHandler(),
  endpointsCreateHandler(),
  endpointsUpdateHandler(),
  endpointsDeleteHandler(),
  authMeAuthenticatedHandler(),
  authLoginSuccessHandler(),
  authLogoutHandler(),
];
