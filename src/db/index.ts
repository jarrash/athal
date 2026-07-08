import postgres, { type Sql } from "postgres";
import { DDL } from "./schema";
import { seedIfEmpty } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __athalSql: Sql | undefined;
  // eslint-disable-next-line no-var
  var __athalReady: Promise<Sql> | undefined;
}

function makeClient(url: string): Sql {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    // Supabase transaction-mode pooler (port 6543) does not support
    // named prepared statements.
    prepare: false,
    ssl: local ? false : "require",
    max: 4,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

/**
 * Connect to the first reachable database. DATABASE_URL is primary;
 * DATABASE_URL_FALLBACK (optional) covers pooler-gateway variants
 * (e.g. aws-0 vs aws-1 hosts) without a redeploy.
 */
async function connect(): Promise<Sql> {
  const candidates = [process.env.DATABASE_URL, process.env.DATABASE_URL_FALLBACK].filter(
    (u): u is string => !!u
  );
  if (candidates.length === 0) throw new Error("DATABASE_URL is not set");

  let lastError: unknown;
  for (const url of candidates) {
    const sql = makeClient(url);
    try {
      await sql`SELECT 1`;
      return sql;
    } catch (err) {
      lastError = err;
      await sql.end({ timeout: 1 }).catch(() => {});
    }
  }
  throw lastError instanceof Error ? lastError : new Error("database unreachable");
}

/**
 * Postgres handle. On first use per process it connects, self-heals the
 * schema (idempotent DDL) and seeds the demo data if the database is empty.
 */
export async function db(): Promise<Sql> {
  if (!globalThis.__athalReady) {
    globalThis.__athalReady = (async () => {
      const sql = await connect();
      try {
        await sql`SELECT 1 FROM users LIMIT 1`;
      } catch {
        await sql.unsafe(DDL);
      }
      await seedIfEmpty(sql);
      globalThis.__athalSql = sql;
      return sql;
    })().catch((err) => {
      globalThis.__athalReady = undefined;
      throw err;
    });
  }
  return globalThis.__athalReady;
}
