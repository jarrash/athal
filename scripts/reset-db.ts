/**
 * Wipe all Athal tables (demo reset). The app re-creates the schema and
 * re-seeds demo data on its next cold start. Requires DATABASE_URL.
 *
 *   DATABASE_URL=postgres://… npm run db:reset
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, ssl: "require" });

const TABLES = [
  "custody_events",
  "evidence_blobs",
  "evidence",
  "obligations",
  "conclusions",
  "audit_log",
  "challenges",
  "step_up_tokens",
  "parties",
  "invitations",
  "cases",
  "ai_providers",
  "users",
  "tenants",
];

(async () => {
  for (const t of TABLES) {
    await sql.unsafe(`DROP TABLE IF EXISTS ${t} CASCADE`);
    console.log("dropped", t);
  }
  await sql.end();
  console.log("done — schema and seed will be recreated on next app start");
})();
