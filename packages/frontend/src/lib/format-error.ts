import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@rel-ai/backend";

export function formatMutationError(error: TRPCClientErrorLike<AppRouter>): string {
  if (error.data?.code === "CONFLICT") {
    return "An item with this identifier already exists.";
  }
  return error.message;
}
