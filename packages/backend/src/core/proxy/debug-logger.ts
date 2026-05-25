import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DEBUG = process.env.LLMPACK_DEBUG === "1";
const LOG_FILE = join("/tmp", "llmpack-debug.log");

export function debugLog(message: string, data?: unknown): void {
  if (!DEBUG) return;
  try {
    mkdirSync("/tmp", { recursive: true });
    const line = data
      ? `[${new Date().toISOString()}] ${message} ${JSON.stringify(data)}\n`
      : `[${new Date().toISOString()}] ${message}\n`;
    appendFileSync(LOG_FILE, line);
  } catch {
    // must not crash app
  }
}
