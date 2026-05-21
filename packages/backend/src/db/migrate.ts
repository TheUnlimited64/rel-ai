import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createDb } from "./connection.js";

const db = createDb();

migrate(db, { migrationsFolder: "./src/db/migrations" });

console.log("Migrations applied successfully.");
