export type TokenResponse = {
  id: string;
  name: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreateTokenResponse = {
  id: string;
  name: string;
  token: string;
};
