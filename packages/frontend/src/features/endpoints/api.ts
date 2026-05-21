import { trpc } from "@/lib/trpc";

export type EndpointListResponse = {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  modelCount: number;
};

export type EndpointGetResponse = {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  models: { id: string; displayName: string }[];
};

export type EndpointCreateResponse = {
  id: string;
  name: string;
  path: string;
  token: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ModelListResponse = {
  id: string;
  displayName: string;
  type: string;
  variant?: string;
};

export async function fetchEndpoints(): Promise<EndpointListResponse[]> {
  return trpc.endpoints.list.query();
}

export async function fetchEndpoint(id: string): Promise<EndpointGetResponse> {
  return trpc.endpoints.get.query({ id });
}

export async function createEndpoint(input: {
  name: string;
  path: string;
  modelIds: string[];
}): Promise<EndpointCreateResponse> {
  return trpc.endpoints.create.mutate(input);
}

export async function updateEndpoint(input: {
  id: string;
  name?: string;
  path?: string;
  enabled?: boolean;
  modelIds?: string[];
}): Promise<EndpointGetResponse> {
  return trpc.endpoints.update.mutate(input);
}

export async function deleteEndpoint(id: string): Promise<{ success: boolean }> {
  return trpc.endpoints.delete.mutate({ id });
}

export async function regenerateToken(id: string): Promise<{ token: string }> {
  return trpc.endpoints.regenerateToken.mutate({ id });
}

export async function getEndpointModels(id: string): Promise<
  { id: string; displayName: string; type: string; providerId: string | null }[]
> {
  return trpc.endpoints.getModels.query({ id });
}

export async function fetchModels(): Promise<ModelListResponse[]> {
  return trpc.models.list.query();
}
