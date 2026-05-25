let _encryptionKey: CryptoKey | null = null;

const KEY_FILE_PATH = process.env.DATA_DIR
  ? `${process.env.DATA_DIR}/.encryption_key`
  : "./data/.encryption_key";

/**
 * Get or create the AES-256-GCM encryption key.
 *
 * Sources checked in order:
 * 1. ENCRYPTION_KEY env var
 * 2. ENCRYPTION_KEY_FILE env var (Docker secrets / file-based mounting)
 * 3. Persistent key file at DATA_DIR/.encryption_key (dev only)
 * 4. Auto-generate ephemeral key (dev only, warns)
 *
 * In production (NODE_ENV=production): hard failure if no key found.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (_encryptionKey) return _encryptionKey;

  let keyMaterial: string;
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey) {
    keyMaterial = envKey;
  } else if (process.env.ENCRYPTION_KEY_FILE) {
    // Docker secrets / file-based secret mounting
    try {
      const fs = await import("node:fs");
      keyMaterial = fs.readFileSync(process.env.ENCRYPTION_KEY_FILE, "utf-8").trim();
    } catch (err) {
      throw new Error(
        `[rel-ai] ENCRYPTION_KEY_FILE is set to "${process.env.ENCRYPTION_KEY_FILE}" but file could not be read: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    // Try to read persisted key from file
    let persistedKey: string | null = null;
    try {
      const fs = await import("node:fs");
      if (fs.existsSync(KEY_FILE_PATH)) {
        persistedKey = fs.readFileSync(KEY_FILE_PATH, "utf-8").trim();
        // Warn if key file permissions are too permissive
        try {
          const stat = fs.statSync(KEY_FILE_PATH);
          const mode = stat.mode & 0o777;
          if (mode & 0o077) {
            console.warn(
              `[rel-ai] WARNING: Encryption key file ${KEY_FILE_PATH} has overly permissive permissions (${mode.toString(8)}). Expected 0600 or more restrictive.`,
            );
          }
        } catch {
          // stat failed — ignore, not critical
        }
      }
    } catch {
      // File read failed — will generate new key
    }

    if (persistedKey) {
      keyMaterial = persistedKey;
    } else if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[rel-ai] ENCRYPTION_KEY or ENCRYPTION_KEY_FILE must be set in production. " +
          "Without a persistent key, encrypted data will not survive restarts. " +
          "Set ENCRYPTION_KEY env var or mount a secrets file via ENCRYPTION_KEY_FILE.",
      );
    } else {
      keyMaterial = crypto.randomUUID() + crypto.randomUUID();
      // Try to persist the generated key
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const dir = path.dirname(KEY_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(KEY_FILE_PATH, keyMaterial, { mode: 0o600 });
        console.warn(
          `[rel-ai] ENCRYPTION_KEY not set. Generated and saved key to ${KEY_FILE_PATH}. Set ENCRYPTION_KEY env var for production use.`,
        );
      } catch {
        console.warn(
          "[rel-ai] ENCRYPTION_KEY not set. Could not persist key to file. Using ephemeral key — encrypted data will NOT survive restart.",
        );
      }
    }
  }

  // Derive a 256-bit key from the key material using SHA-256
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keyMaterial));
  _encryptionKey = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);

  return _encryptionKey;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns format: base64(iv):base64(ciphertext)
 * Note: AES-GCM appends auth tag to ciphertext automatically.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${Buffer.from(iv).toString("base64")}:${Buffer.from(ciphertext).toString("base64")}`;
}

/**
 * Decrypt ciphertext encrypted with AES-256-GCM.
 * Expects format: base64(iv):base64(ciphertext)
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const [ivB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !dataB64) {
    throw new Error("Invalid ciphertext format");
  }
  const iv = Buffer.from(ivB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plaintext);
}

/**
 * Reset the cached encryption key (useful for tests).
 */
export function resetEncryptionKey(): void {
  _encryptionKey = null;
}

export function getKeyFilePath(): string {
  return KEY_FILE_PATH;
}
