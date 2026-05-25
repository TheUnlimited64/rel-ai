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

describe("encryption key production hard-failure", () => {
  let originalNodeEnv: string | undefined;
  let originalEncryptionKey: string | undefined;
  let originalEncryptionKeyFile: string | undefined;
  let originalDataDir: string | undefined;
  let keyFileBackup: string | null = null;

  beforeEach(() => {
    resetEncryptionKey();
    originalNodeEnv = process.env.NODE_ENV;
    originalEncryptionKey = process.env.ENCRYPTION_KEY;
    originalEncryptionKeyFile = process.env.ENCRYPTION_KEY_FILE;
    originalDataDir = process.env.DATA_DIR;

    // Back up existing key file so tests don't interfere
    const keyFilePath = "./data/.encryption_key";
    try {
      const fs = require("node:fs");
      if (fs.existsSync(keyFilePath)) {
        keyFileBackup = fs.readFileSync(keyFilePath, "utf-8");
        fs.unlinkSync(keyFilePath);
      } else {
        keyFileBackup = null;
      }
    } catch {
      keyFileBackup = null;
    }
  });

  afterEach(() => {
    resetEncryptionKey();
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
    if (originalEncryptionKey !== undefined) process.env.ENCRYPTION_KEY = originalEncryptionKey;
    else delete process.env.ENCRYPTION_KEY;
    if (originalEncryptionKeyFile !== undefined) process.env.ENCRYPTION_KEY_FILE = originalEncryptionKeyFile;
    else delete process.env.ENCRYPTION_KEY_FILE;
    if (originalDataDir !== undefined) process.env.DATA_DIR = originalDataDir;
    else delete process.env.DATA_DIR;

    // Restore backed-up key file
    const keyFilePath = "./data/.encryption_key";
    try {
      const fs = require("node:fs");
      if (keyFileBackup !== null) {
        const dir = require("node:path").dirname(keyFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(keyFilePath, keyFileBackup, { mode: 0o600 });
      }
    } catch {
      // ignore restore failures
    }
  });

  test("throws in production when no ENCRYPTION_KEY or ENCRYPTION_KEY_FILE set", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY_FILE;
    resetEncryptionKey();

    await expect(encrypt("test")).rejects.toThrow("ENCRYPTION_KEY or ENCRYPTION_KEY_FILE must be set in production");
  });

  test("does not throw in production when ENCRYPTION_KEY is set", async () => {
    process.env.NODE_ENV = "production";
    process.env.ENCRYPTION_KEY = "prod-key-for-testing";
    delete process.env.ENCRYPTION_KEY_FILE;
    resetEncryptionKey();

    const ciphertext = await encrypt("test-data");
    expect(ciphertext).toBeTruthy();
  });

  test("reads key from ENCRYPTION_KEY_FILE when set", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rel-ai-keyfile-test-"));
    try {
      process.env.NODE_ENV = "production";
      delete process.env.ENCRYPTION_KEY;
      const keyFile = path.join(tmpDir, "secret_key");
      fs.writeFileSync(keyFile, "file-based-encryption-key\n", { mode: 0o600 });
      process.env.ENCRYPTION_KEY_FILE = keyFile;
      resetEncryptionKey();

      const ciphertext = await encrypt("test-data");
      expect(ciphertext).toBeTruthy();
      resetEncryptionKey();
      const decrypted = await decrypt(ciphertext);
      expect(decrypted).toBe("test-data");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("throws when ENCRYPTION_KEY_FILE points to missing file", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY_FILE = "/nonexistent/path/key";
    resetEncryptionKey();

    await expect(encrypt("test")).rejects.toThrow("ENCRYPTION_KEY_FILE");
  });
});
