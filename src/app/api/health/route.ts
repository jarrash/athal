import { NextResponse } from "next/server";
import { db } from "@/db";

/** Deployment self-diagnosis: database connectivity + seed state. */
export async function GET() {
  try {
    const sql = await db();
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM users`;
    return NextResponse.json({ ok: true, db: "connected", users: n });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: err instanceof Error ? err.message.slice(0, 200) : "error" },
      { status: 503 }
    );
  }
}
