import { TRPCError } from "@trpc/server";

export async function mapNotFound<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
    }
    throw e;
  }
}
