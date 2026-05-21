import { trpc } from "@/lib/trpc";

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

export async function fetchTokens(): Promise<TokenResponse[]> {
  return trpc.auth.listTokens.query();
}

export async function createToken(name: string): Promise<CreateTokenResponse> {
  return trpc.auth.createToken.mutate({ name });
}

export async function deleteToken(id: string): Promise<{ success: boolean }> {
  return trpc.auth.deleteToken.mutate({ id });
}
