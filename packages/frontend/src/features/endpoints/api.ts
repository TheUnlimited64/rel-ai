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

export function getProxyBase(): string {
  return import.meta.env.VITE_PROXY_BASE ?? window.location.origin + "/v1";
}
