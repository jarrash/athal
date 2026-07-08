import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import ReportView, { type ConclusionRow } from "./ReportView";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const handle = db();

  const kase = handle
    .prepare("SELECT id FROM cases WHERE id = ? AND tenant_id = ?")
    .get(id, session.tenantId) as { id: string } | undefined;
  if (!kase) notFound();

  const rows = handle
    .prepare("SELECT * FROM conclusions WHERE case_id = ? ORDER BY number ASC")
    .all(kase.id) as {
    id: string; number: string; section_label: string; section_title: string; text: string;
    status: string; citations: string; trace_considered: string | null;
    trace_excluded: string | null; trace_rationale: string | null;
    approved_by: string | null;
  }[];

  const evidence = handle
    .prepare("SELECT ref, id, title FROM evidence WHERE case_id = ? AND status != 'quarantined'")
    .all(kase.id) as { ref: string; id: string; title: string }[];

  const conclusions: ConclusionRow[] = rows.map((r) => ({
    id: r.id,
    number: r.number,
    sectionLabel: r.section_label,
    sectionTitle: r.section_title,
    text: r.text,
    status: r.status as "approved" | "pending",
    citations: JSON.parse(r.citations) as string[],
    trace:
      r.trace_considered || r.trace_excluded || r.trace_rationale
        ? {
            considered: r.trace_considered ?? "",
            excluded: r.trace_excluded ?? "",
            rationale: r.trace_rationale ?? "",
          }
        : null,
    approvedBy: r.approved_by,
  }));

  return <ReportView caseId={kase.id} conclusions={conclusions} evidenceOptions={evidence} />;
}
