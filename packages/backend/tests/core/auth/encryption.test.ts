import { describe, expect, test, beforeEach } from "bun:test";
import { encrypt, decrypt, resetEncryptionKey } from "../../../src/core/auth/encryption.js";

describe("encryption", () => {
  beforeEach(() => {
    resetEncryptionKey();
    delete process.env.ENCRYPTION_KEY;
  });

  test("encrypt/decrypt roundtrip", async () => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-testing";
    resetEncryptionKey();
    const plaintext = "sk-secret-api-key-12345";
    const ciphertext = await encrypt(plaintext);
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  test("ciphertext format is base64(iv):base64(data)", async () => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-testing";
    resetEncryptionKey();
    const ciphertext = await encrypt("hello");
    const parts = ciphertext.split(":");
    expect(parts).toHaveLength(2);
    // IV is 12 bytes = 16 base64 chars
    expect(parts[0]!.length).toBeGreaterThan(0);
    expect(parts[1]!.length).toBeGreaterThan(0);
  });

  test("each encryption produces different ciphertext", async () => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-testing";
    resetEncryptionKey();
    const ct1 = await encrypt("same-input");
    resetEncryptionKey();
    const ct2 = await encrypt("same-input");
    expect(ct1).not.toBe(ct2);
  });

  test("decrypt throws on invalid format", async () => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-testing";
    resetEncryptionKey();
    await expect(decrypt("invalid")).rejects.toThrow("Invalid ciphertext format");
  });

  test("decrypt throws on tampered ciphertext", async () => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-testing";
    resetEncryptionKey();
    const ciphertext = await encrypt("secret");
    // Tamper with the ciphertext portion
    const [iv, data] = ciphertext.split(":");
    const tamperedData = data!.replace(/./, "X");
    await expect(decrypt(`${iv}:${tamperedData}`)).rejects.toThrow();
  });
});
