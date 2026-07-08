import type { Sql } from "postgres";
import { chainHash } from "./crypto";

/**
 * Append-only, hash-chained logs. Each entry's hash covers the previous
 * entry's hash + this entry's payload: eventHash = H(prevEventHash + payload).
 * Nothing here ever updates or deletes rows.
 */

export async function appendAudit(
  sql: Sql,
  entry: {
    tenantId: string;
    caseId?: string | null;
    kind: string;
    text: string;
    actor: string;
    ip?: string | null;
  }
) {
  const at = new Date().toISOString();
  const last = await sql`
    SELECT event_hash FROM audit_log WHERE tenant_id = ${entry.tenantId} ORDER BY id DESC LIMIT 1`;
  const prev = last[0]?.event_hash ?? null;
  const hash = chainHash(prev, { ...entry, at });
  await sql`
    INSERT INTO audit_log (tenant_id, case_id, kind, text, actor, ip, at, prev_hash, event_hash)
    VALUES (${entry.tenantId}, ${entry.caseId ?? null}, ${entry.kind}, ${entry.text}, ${entry.actor}, ${entry.ip ?? null}, ${at}, ${prev}, ${hash})`;
}

export async function appendCustody(sql: Sql, evidenceId: string, action: string, actor: string) {
  const at = new Date().toISOString();
  const last = await sql`
    SELECT event_hash FROM custody_events WHERE evidence_id = ${evidenceId} ORDER BY id DESC LIMIT 1`;
  const prev = last[0]?.event_hash ?? null;
  const hash = chainHash(prev, { evidenceId, action, actor, at });
  await sql`
    INSERT INTO custody_events (evidence_id, action, actor, at, prev_hash, event_hash)
    VALUES (${evidenceId}, ${action}, ${actor}, ${at}, ${prev}, ${hash})`;
}

/** Walk the tenant's audit chain and confirm its linkage is unbroken. */
export async function verifyAuditChain(sql: Sql, tenantId: string): Promise<boolean> {
  const rows = await sql`
    SELECT prev_hash, event_hash FROM audit_log WHERE tenant_id = ${tenantId} ORDER BY id ASC`;
  let prev: string | null = null;
  for (const r of rows) {
    if (r.prev_hash !== prev) return false;
    prev = r.event_hash;
  }
  return true;
}
