let _encryptionKey: CryptoKey | null = null;

/**
 * Get or create the AES-256-GCM encryption key from ENCRYPTION_KEY env var.
 * If not set, generates one on first run and logs a warning.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (_encryptionKey) return _encryptionKey;

  let keyMaterial: string;
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey) {
    keyMaterial = envKey;
  } else {
    keyMaterial = crypto.randomUUID() + crypto.randomUUID();
    console.warn(
      "[rel-ai] ENCRYPTION_KEY not set. Generated ephemeral key. Set ENCRYPTION_KEY for persistent encryption.",
    );
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
