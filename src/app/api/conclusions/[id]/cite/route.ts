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
  const sql = await db();

  const [conc] = (await sql`
    SELECT co.* FROM conclusions co JOIN cases c ON c.id = co.case_id
    WHERE co.id = ${id} AND c.tenant_id = ${session.tenantId}`) as
    { id: string; case_id: string; number: string; citations: string; text: string }[];
  if (!conc) return NextResponse.json({ error: "الاستنتاج غير موجود" }, { status: 404 });

  // The citation must point at real evidence deposited in the same case.
  const [ev] = (await sql`
    SELECT ref FROM evidence WHERE case_id = ${conc.case_id} AND ref = ${String(ref ?? "")} AND status != 'quarantined'`) as
    { ref: string }[];
  if (!ev) {
    return NextResponse.json({ error: "الدليل المُشار إليه غير موجود في خزنة هذه القضية" }, { status: 400 });
  }

  const citations: string[] = JSON.parse(conc.citations);
  if (!citations.includes(ev.ref)) citations.push(ev.ref);
  await sql`UPDATE conclusions SET citations = ${JSON.stringify(citations)} WHERE id = ${conc.id}`;

  const [{ n: remainingBlockers }] = await sql`
    SELECT count(*)::int AS n FROM conclusions WHERE case_id = ${conc.case_id} AND citations = '[]'`;

  await appendAudit(sql, {
    tenantId: session.tenantId,
    caseId: conc.case_id,
    kind: "استشهاد",
    text: `إدراج استشهاد ${ev.ref} في استنتاج ${conc.number}${remainingBlockers === 0 ? " — زال مانع التصدير" : ""}`,
    actor: `${session.name} — الخبير`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, citations, exportBlocked: remainingBlockers > 0 });
});
