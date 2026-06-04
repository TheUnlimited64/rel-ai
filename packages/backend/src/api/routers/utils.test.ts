import { describe, it, expect } from "bun:test";
import { TRPCError } from "@trpc/server";
import { mapNotFound } from "./utils.js";

describe("mapNotFound", () => {
  it("returns the result when fn succeeds", async () => {
    const result = await mapNotFound(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("throws TRPCError NOT_FOUND when fn throws Error with message NOT_FOUND", () => {
    expect(
      mapNotFound(() => Promise.reject(new Error("NOT_FOUND"))),
    ).rejects.toThrow(TRPCError);
  });

  it("throws TRPCError with code NOT_FOUND", async () => {
    try {
      await mapNotFound(() => Promise.reject(new Error("NOT_FOUND")));
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("re-throws non-NOT_FOUND errors unchanged", () => {
    const error = new Error("OTHER_ERROR");
    expect(
      mapNotFound(() => Promise.reject(error)),
    ).rejects.toBe(error);
  });

  it("re-throws non-Error exceptions unchanged", () => {
    const errStr = "string error";
    expect(
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      mapNotFound(() => Promise.reject(errStr)),
    ).rejects.toBe(errStr);
  });
});
