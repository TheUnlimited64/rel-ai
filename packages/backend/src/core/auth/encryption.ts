let _encryptionKey: CryptoKey | null = null;

const KEY_FILE_PATH = process.env.DATA_DIR
  ? `${process.env.DATA_DIR}/.encryption_key`
  : "./data/.encryption_key";

/**
 * Get or create the AES-256-GCM encryption key from ENCRYPTION_KEY env var.
 * If not set, tries to read from a persistent key file.
 * If file doesn't exist, generates a new key, writes it to the file, and logs a warning.
 * Falls back to ephemeral in-memory key if file write fails (non-Docker dev).
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (_encryptionKey) return _encryptionKey;

  let keyMaterial: string;
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey) {
    keyMaterial = envKey;
  } else {
    // Try to read persisted key from file
    let persistedKey: string | null = null;
    try {
      const fs = await import("node:fs");
      if (fs.existsSync(KEY_FILE_PATH)) {
        persistedKey = fs.readFileSync(KEY_FILE_PATH, "utf-8").trim();
      }
    } catch {
      // File read failed — will generate new key
    }

    if (persistedKey) {
      keyMaterial = persistedKey;
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
        fs.writeFileSync(KEY_FILE_PATH, keyMaterial, "utf-8");
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
