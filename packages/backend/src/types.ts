// Types-only entry point for consumers that only need type information
// This avoids pulling in runtime dependencies like bun:sqlite
export type { AppRouter } from "./api/router.js";
