import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@rel-ai/backend";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type TokenResponse = RouterOutputs["auth"]["listTokens"][number];
export type CreateTokenResponse = RouterOutputs["auth"]["createToken"];
