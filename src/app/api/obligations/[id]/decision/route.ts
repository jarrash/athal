import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { consumeStepUpToken } from "@/lib/stepup";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler, requireDecisionRole, requireSession } from "@/lib/api";

/**
 * Expert decision on an AI-suggested obligation.
 * "الذكاء يقترح، والخبير يعتمد" — approval requires a fresh step-up (OTP)
 * signature verified here on the server, every single time.
 */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession(req);
  requireDecisionRole(session);
  const { id } = await ctx.params;
  const { decision } = await req.json();
  const sql = await db();

  const [ob] = (await sql`
    SELECT o.* FROM obligations o JOIN cases c ON c.id = o.case_id
    WHERE o.id = ${id} AND c.tenant_id = ${session.tenantId}`) as
    { id: string; case_id: string; clause: string; confidence: number; decision: string }[];
  if (!ob) return NextResponse.json({ error: "البند غير موجود" }, { status: 404 });

  if (!["approved", "rejected", "suggested"].includes(decision)) {
    return NextResponse.json({ error: "قرار غير صالح" }, { status: 400 });
  }

  if (decision === "approved") {
    const stepUp = await consumeStepUpToken(sql, session, req.headers.get("x-step-up-token"));
    if (!stepUp) {
      return NextResponse.json(
        { error: "الاعتماد يتطلب مصادقة معززة (OTP) موقّعة من الخادم" },
        { status: 403 }
      );
    }
  }

  const now = new Date().toISOString();
  await sql`
    UPDATE obligations SET
      decision = ${decision},
      decided_by = ${decision === "suggested" ? null : session.name},
      decided_at = ${decision === "suggested" ? null : now}
    WHERE id = ${ob.id}`;

  const ip = clientIp(req);
  if (decision === "approved") {
    await appendAudit(sql, {
      tenantId: session.tenantId, caseId: ob.case_id, kind: "اعتماد ذكاء",
      text: `اعتماد بند: ${ob.clause} (ثقة ${ob.confidence}%)`, actor: `${session.name} — الخبير`, ip,
    });
  } else if (decision === "rejected") {
    await appendAudit(sql, {
      tenantId: session.tenantId, caseId: ob.case_id, kind: "رفض ذكاء",
      text: `رفض بند: ${ob.clause}`, actor: `${session.name} — الخبير`, ip,
    });
  } else {
    await appendAudit(sql, {
      tenantId: session.tenantId, caseId: ob.case_id, kind: "إدارة",
      text: `تراجع عن قرار سابق في بند: ${ob.clause}`, actor: `${session.name} — الخبير`, ip,
    });
  }

  return NextResponse.json({ ok: true, decidedAt: now });
});
