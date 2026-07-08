import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import CopilotView, { type ObligationRow, type PartyRow } from "./CopilotView";

export const dynamic = "force-dynamic";

export default async function CopilotPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const sql = await db();

  const [kase] = (await sql`
    SELECT id FROM cases WHERE id = ${id} AND tenant_id = ${session.tenantId}`) as { id: string }[];
  if (!kase) notFound();

  const parties = (await sql`
    SELECT * FROM parties WHERE case_id = ${kase.id}`) as PartyRow[];

  const rows = (await sql`
    SELECT * FROM obligations WHERE case_id = ${kase.id} ORDER BY confidence DESC`) as {
    id: string; clause: string; responsible: string; status: string;
    evidence_refs: string; confidence: number; decision: string;
    decided_by: string | null; decided_at: string | null;
  }[];

  const evidenceByRef = (await sql`
    SELECT ref, id FROM evidence WHERE case_id = ${kase.id}`) as { ref: string; id: string }[];
  const refMap = Object.fromEntries(evidenceByRef.map((e) => [e.ref, e.id]));

  const obligations: ObligationRow[] = rows.map((r) => ({
    id: r.id,
    clause: r.clause,
    responsible: r.responsible,
    status: r.status,
    refs: (JSON.parse(r.evidence_refs) as string[]).map((ref) => ({
      ref,
      evidenceId: refMap[ref] ?? null,
    })),
    confidence: r.confidence,
    decision: r.decision as ObligationRow["decision"],
    decidedBy: r.decided_by,
    decidedAt: r.decided_at,
  }));

  return <CopilotView caseId={kase.id} parties={parties} obligations={obligations} />;
}
