import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler, requireDecisionRole, requireSession } from "@/lib/api";

/** Attach an evidence citation to a report conclusion (clears the export blocker). */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession(req);
  requireDecisionRole(session);
  const { id } = await ctx.params;
  const { ref } = await req.json();
  const handle = db();

  const conc = handle
    .prepare(
      `SELECT co.* FROM conclusions co JOIN cases c ON c.id = co.case_id
       WHERE co.id = ? AND c.tenant_id = ?`
    )
    .get(id, session.tenantId) as
    | { id: string; case_id: string; number: string; citations: string; text: string }
    | undefined;
  if (!conc) return NextResponse.json({ error: "الاستنتاج غير موجود" }, { status: 404 });

  // The citation must point at real evidence deposited in the same case.
  const ev = handle
    .prepare("SELECT ref FROM evidence WHERE case_id = ? AND ref = ? AND status != 'quarantined'")
    .get(conc.case_id, String(ref ?? "")) as { ref: string } | undefined;
  if (!ev) {
    return NextResponse.json({ error: "الدليل المُشار إليه غير موجود في خزنة هذه القضية" }, { status: 400 });
  }

  const citations: string[] = JSON.parse(conc.citations);
  if (!citations.includes(ev.ref)) citations.push(ev.ref);
  handle
    .prepare("UPDATE conclusions SET citations = ? WHERE id = ?")
    .run(JSON.stringify(citations), conc.id);

  const remainingBlockers = (
    handle
      .prepare("SELECT COUNT(*) AS n FROM conclusions WHERE case_id = ? AND citations = '[]'")
      .get(conc.case_id) as { n: number }
  ).n;

  appendAudit(db(), {
    tenantId: session.tenantId,
    caseId: conc.case_id,
    kind: "استشهاد",
    text: `إدراج استشهاد ${ev.ref} في استنتاج ${conc.number}${remainingBlockers === 0 ? " — زال مانع التصدير" : ""}`,
    actor: `${session.name} — الخبير`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, citations, exportBlocked: remainingBlockers > 0 });
});
