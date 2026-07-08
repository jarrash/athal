import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import { DDL } from "./schema";
import { seedIfEmpty } from "./seed";

const DATA_DIR = process.env.ATHAL_DATA_DIR ?? path.join(process.cwd(), ".data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

declare global {
  // eslint-disable-next-line no-var
  var __athalDb: Database.Database | undefined;
}

/** Singleton SQLite handle (survives Next.js dev hot-reload via globalThis). */
export function db(): Database.Database {
  if (!globalThis.__athalDb) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
    const handle = new Database(path.join(DATA_DIR, "athal.db"));
    handle.pragma("journal_mode = WAL");
    handle.pragma("foreign_keys = ON");
    handle.exec(DDL);
    seedIfEmpty(handle);
    globalThis.__athalDb = handle;
  }
  return globalThis.__athalDb;
}
