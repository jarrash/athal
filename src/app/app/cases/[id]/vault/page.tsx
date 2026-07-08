import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import VaultView, { type EvidenceRow } from "./VaultView";

export const dynamic = "force-dynamic";

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const handle = db();

  const kase = handle
    .prepare("SELECT id FROM cases WHERE id = ? AND tenant_id = ?")
    .get(id, session.tenantId) as { id: string } | undefined;
  if (!kase) notFound();

  const rows = handle
    .prepare("SELECT * FROM evidence WHERE case_id = ? ORDER BY uploaded_at DESC")
    .all(kase.id) as {
    id: string; ref: string; title: string; filename: string; sha256: string;
    status: string; party_label: string | null;
  }[];

  const chainStmt = handle.prepare(
    "SELECT action, actor, at FROM custody_events WHERE evidence_id = ? ORDER BY id DESC"
  );
  const evidence: EvidenceRow[] = rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    title: r.title,
    filename: r.filename,
    sha256: r.sha256,
    status: r.status,
    party: r.party_label ?? "—",
    chain: chainStmt.all(r.id) as { action: string; actor: string; at: string }[],
  }));

  return <VaultView caseId={kase.id} evidence={evidence} />;
}
