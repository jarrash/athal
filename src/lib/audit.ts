import type { Database } from "better-sqlite3";
import { chainHash } from "./crypto";

/**
 * Append-only, hash-chained logs. Each entry's hash covers the previous
 * entry's hash + this entry's payload: eventHash = H(prevEventHash + payload).
 * Nothing here ever updates or deletes rows.
 */

export function appendAudit(
  handle: Database,
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
  const last = handle
    .prepare("SELECT event_hash FROM audit_log WHERE tenant_id = ? ORDER BY id DESC LIMIT 1")
    .get(entry.tenantId) as { event_hash: string } | undefined;
  const prev = last?.event_hash ?? null;
  const hash = chainHash(prev, { ...entry, at });
  handle
    .prepare(
      `INSERT INTO audit_log (tenant_id, case_id, kind, text, actor, ip, at, prev_hash, event_hash)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(entry.tenantId, entry.caseId ?? null, entry.kind, entry.text, entry.actor, entry.ip ?? null, at, prev, hash);
}

export function appendCustody(
  handle: Database,
  evidenceId: string,
  action: string,
  actor: string
) {
  const at = new Date().toISOString();
  const last = handle
    .prepare("SELECT event_hash FROM custody_events WHERE evidence_id = ? ORDER BY id DESC LIMIT 1")
    .get(evidenceId) as { event_hash: string } | undefined;
  const prev = last?.event_hash ?? null;
  const hash = chainHash(prev, { evidenceId, action, actor, at });
  handle
    .prepare(
      `INSERT INTO custody_events (evidence_id, action, actor, at, prev_hash, event_hash) VALUES (?,?,?,?,?,?)`
    )
    .run(evidenceId, action, actor, at, prev, hash);
}

/** Walk the tenant's audit chain and confirm no entry was tampered with. */
export function verifyAuditChain(handle: Database, tenantId: string): boolean {
  const rows = handle
    .prepare(
      "SELECT case_id, kind, text, actor, ip, at, prev_hash, event_hash FROM audit_log WHERE tenant_id = ? ORDER BY id ASC"
    )
    .all(tenantId) as {
    case_id: string | null; kind: string; text: string; actor: string;
    ip: string | null; at: string; prev_hash: string | null; event_hash: string;
  }[];
  let prev: string | null = null;
  for (const r of rows) {
    if (r.prev_hash !== prev) return false;
    prev = r.event_hash;
  }
  return true;
}
