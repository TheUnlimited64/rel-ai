export type EndpointListResponse = {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  modelCount: number;
  proxyBase: string;
};

export type EndpointGetResponse = {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  models: { id: string; displayName: string }[];
  groups: { id: string; name: string }[];
  proxyBase: string;
};

export type EndpointCreateResponse = {
  id: string;
  name: string;
  path: string;
  token: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  proxyBase: string;
};

export type ModelListResponse = {
  id: string;
  displayName: string;
  type: string;
  variant?: string;
};
