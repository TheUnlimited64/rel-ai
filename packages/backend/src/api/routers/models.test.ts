import { describe, it, expect } from "bun:test";
import { TRPCError } from "@trpc/server";
import { mapServiceError } from "./models.js";

describe("mapServiceError", () => {
  it("maps sync NOT_FOUND to TRPCError NOT_FOUND", async () => {
    await expect(
      mapServiceError(() => {
        throw new Error("NOT_FOUND");
      }),
    ).rejects.toThrow(TRPCError);
  });

  it("maps sync DUPLICATE_ID to TRPCError CONFLICT", async () => {
    try {
      await mapServiceError(() => {
        throw new Error("DUPLICATE_ID");
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("CONFLICT");
    }
  });

  it("maps sync CIRCULAR_DEPENDENCY to TRPCError BAD_REQUEST", async () => {
    try {
      await mapServiceError(() => {
        throw new Error("CIRCULAR_DEPENDENCY");
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("re-throws sync non-matching errors unchanged", async () => {
    const error = new Error("SOMETHING_ELSE");
    await expect(
      mapServiceError(() => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  it("re-throws sync non-Error exceptions unchanged", async () => {
    const errStr = "string error";
    await expect(
      mapServiceError(() => {
        throw errStr;
      }),
    ).rejects.toBe(errStr);
  });

  it("maps async NOT_FOUND to TRPCError NOT_FOUND", async () => {
    await expect(
      mapServiceError(() => Promise.reject(new Error("NOT_FOUND"))),
    ).rejects.toThrow(TRPCError);
  });

  it("maps async DUPLICATE_ID to TRPCError CONFLICT", async () => {
    try {
      await mapServiceError(() => Promise.reject(new Error("DUPLICATE_ID")));
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("CONFLICT");
    }
  });

  it("maps async CIRCULAR_DEPENDENCY to TRPCError BAD_REQUEST", async () => {
    try {
      await mapServiceError(() =>
        Promise.reject(new Error("CIRCULAR_DEPENDENCY")),
      );
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("maps async PROVIDER_NOT_FOUND to TRPCError NOT_FOUND", async () => {
    try {
      await mapServiceError(() =>
        Promise.reject(new Error("PROVIDER_NOT_FOUND")),
      );
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("maps async HAS_DEPENDENTS to TRPCError PRECONDITION_FAILED with dependents", async () => {
    try {
      await mapServiceError(() =>
        Promise.reject(new Error("HAS_DEPENDENTS:[\"model-1\",\"model-2\"]")),
      );
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
      expect((e as { dependents?: string[] }).dependents).toEqual([
        "model-1",
        "model-2",
      ]);
    }
  });

  it("re-throws async non-matching errors unchanged", async () => {
    const error = new Error("SOMETHING_ELSE");
    await expect(
      mapServiceError(() => Promise.reject(error)),
    ).rejects.toBe(error);
  });

  it("re-throws async non-Error exceptions unchanged", async () => {
    const errStr = "string error";
    await expect(
      mapServiceError(() => Promise.reject(errStr)),
    ).rejects.toBe(errStr);
  });

  it("returns resolved async values", async () => {
    const result = await mapServiceError(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("returns sync values", async () => {
    const result = await mapServiceError(() => "sync-ok");
    expect(result).toBe("sync-ok");
  });
});
