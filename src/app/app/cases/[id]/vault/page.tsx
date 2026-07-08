import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import VaultView, { type EvidenceRow } from "./VaultView";

export const dynamic = "force-dynamic";

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const sql = await db();

  const [kase] = (await sql`
    SELECT id FROM cases WHERE id = ${id} AND tenant_id = ${session.tenantId}`) as { id: string }[];
  if (!kase) notFound();

  const rows = (await sql`
    SELECT * FROM evidence WHERE case_id = ${kase.id} ORDER BY uploaded_at DESC`) as {
    id: string; ref: string; title: string; filename: string; sha256: string;
    status: string; party_label: string | null;
  }[];

  const chains = (await sql`
    SELECT evidence_id, action, actor, at FROM custody_events
    WHERE evidence_id IN ${sql(rows.length ? rows.map((r) => r.id) : [""])}
    ORDER BY id DESC`) as { evidence_id: string; action: string; actor: string; at: string }[];

  const evidence: EvidenceRow[] = rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    title: r.title,
    filename: r.filename,
    sha256: r.sha256,
    status: r.status,
    party: r.party_label ?? "—",
    chain: chains
      .filter((c) => c.evidence_id === r.id)
      .map(({ action, actor, at }) => ({ action, actor, at })),
  }));

  return <VaultView caseId={kase.id} evidence={evidence} />;
}
