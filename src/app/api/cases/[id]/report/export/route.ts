import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { consumeStepUpToken } from "@/lib/stepup";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler, requireDecisionRole, requireSession } from "@/lib/api";

/**
 * Report export — the platform's hardest guardrail.
 * The server INDEPENDENTLY re-validates the citation gate (zero uncited
 * conclusions) and the step-up signature before allowing the export,
 * regardless of what the client claimed.
 */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession(req);
  requireDecisionRole(session);
  const { id } = await ctx.params;
  const { format } = await req.json().catch(() => ({ format: "PDF" }));
  const handle = db();

  const kase = handle
    .prepare("SELECT * FROM cases WHERE id = ? AND tenant_id = ?")
    .get(id, session.tenantId) as { id: string; case_number: string } | undefined;
  if (!kase) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });

  // 1) Citation gate — hard server-side check, not a UI affordance.
  const uncited = handle
    .prepare("SELECT number FROM conclusions WHERE case_id = ? AND citations = '[]'")
    .all(kase.id) as { number: string }[];
  if (uncited.length > 0) {
    return NextResponse.json(
      {
        error: `مانع — استنتاج بلا استشهاد (${uncited.map((u) => u.number).join("، ")}). أضف دليلًا واحدًا على الأقل لكل استنتاج قبل التصدير.`,
        blockers: uncited.map((u) => u.number),
      },
      { status: 409 }
    );
  }

  // 2) Step-up signature — verified and consumed server-side.
  const stepUp = await consumeStepUpToken(handle, session, req.headers.get("x-step-up-token"));
  if (!stepUp) {
    return NextResponse.json(
      { error: "التصدير يتطلب مصادقة معززة (OTP) موقّعة من الخادم" },
      { status: 403 }
    );
  }

  appendAudit(handle, {
    tenantId: session.tenantId,
    caseId: kase.id,
    kind: "تصدير",
    text: `تصدير التقرير الابتدائي ${String(format)} مع الملاحق التلقائية — ${kase.case_number}`,
    actor: `${session.name} — الخبير`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, printUrl: `/app/cases/${kase.id}/report/print` });
});
