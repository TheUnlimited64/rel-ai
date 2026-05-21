import { providers } from "../../db/schema/index.js";
import { encrypt, decrypt } from "../auth/encryption.js";
import { eq } from "drizzle-orm";
import type { DbClient } from "../../db/connection.js";

export async function migratePlaintextApiKeys(db: DbClient): Promise<void> {
  const rows = db.select({ id: providers.id, apiKey: providers.apiKey }).from(providers).all();
  for (const row of rows) {
    try {
      await decrypt(row.apiKey); // already encrypted — skip
    } catch {
      const encrypted = await encrypt(row.apiKey);
      db.update(providers).set({ apiKey: encrypted }).where(eq(providers.id, row.id)).run();
    }
  }
}
