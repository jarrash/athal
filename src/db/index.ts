import postgres, { type Sql } from "postgres";
import { DDL } from "./schema";
import { seedIfEmpty } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __athalSql: Sql | undefined;
  // eslint-disable-next-line no-var
  var __athalReady: Promise<void> | undefined;
}

function client(): Sql {
  if (!globalThis.__athalSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalThis.__athalSql = postgres(url, {
      // Supabase transaction-mode pooler (port 6543) does not support
      // named prepared statements.
      prepare: false,
      ssl: "require",
      max: 4,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return globalThis.__athalSql;
}

/**
 * Postgres handle. On first use per process it self-heals the schema
 * (idempotent DDL) and seeds the demo data if the database is empty.
 */
export async function db(): Promise<Sql> {
  const sql = client();
  if (!globalThis.__athalReady) {
    globalThis.__athalReady = (async () => {
      try {
        await sql`SELECT 1 FROM users LIMIT 1`;
      } catch {
        await sql.unsafe(DDL);
      }
      await seedIfEmpty(sql);
    })().catch((err) => {
      globalThis.__athalReady = undefined;
      throw err;
    });
  }
  await globalThis.__athalReady;
  return sql;
}
