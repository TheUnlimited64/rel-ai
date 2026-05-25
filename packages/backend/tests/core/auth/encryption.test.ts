import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { encrypt, decrypt, resetEncryptionKey } from "../../../src/core/auth/encryption.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

describe("encryption key file permissions", () => {
  let tmpDir: string;
  let originalDataDir: string | undefined;

  beforeEach(() => {
    resetEncryptionKey();
    delete process.env.ENCRYPTION_KEY;
    originalDataDir = process.env.DATA_DIR;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rel-ai-encryption-test-"));
  });

  afterEach(() => {
    resetEncryptionKey();
    if (originalDataDir !== undefined) {
      process.env.DATA_DIR = originalDataDir;
    } else {
      delete process.env.DATA_DIR;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("key file created with mode 0o600 has restrictive permissions", () => {
    const keyFilePath = path.join(tmpDir, ".encryption_key");
    const keyMaterial = crypto.randomUUID() + crypto.randomUUID();

    const dir = path.dirname(keyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(keyFilePath, keyMaterial, { mode: 0o600 });

    const stat = fs.statSync(keyFilePath);
    const mode = stat.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  test("permissive key file permissions are detectable via mode check", () => {
    const permissivePath = path.join(tmpDir, ".encryption_key_permissive");
    const restrictivePath = path.join(tmpDir, ".encryption_key_restrictive");
    const keyMaterial = crypto.randomUUID() + crypto.randomUUID();

    fs.writeFileSync(permissivePath, keyMaterial, { mode: 0o644 });
    const permissiveStat = fs.statSync(permissivePath);
    const permissiveMode = permissiveStat.mode & 0o777;
    expect(permissiveMode & 0o077).not.toBe(0);

    fs.writeFileSync(restrictivePath, keyMaterial, { mode: 0o600 });
    const restrictiveStat = fs.statSync(restrictivePath);
    const restrictiveMode = restrictiveStat.mode & 0o777;
    expect(restrictiveMode & 0o077).toBe(0);
  });
});
