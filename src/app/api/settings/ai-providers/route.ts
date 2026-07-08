import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler, requireDecisionRole, requireSession } from "@/lib/api";

/** Toggle an optional AI provider. The sovereign default is locked on. */
export const POST = handler(async (req: NextRequest) => {
  const session = await requireSession(req);
  requireDecisionRole(session);
  const { provider, enabled } = await req.json();
  const sql = await db();

  const [row] = (await sql`
    SELECT * FROM ai_providers WHERE tenant_id = ${session.tenantId} AND provider = ${String(provider ?? "")}`) as
    { provider: string; label: string; model: string; locked: number; scope: string }[];
  if (!row) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
  if (row.locked) {
    return NextResponse.json({ error: "المزود السيادي الافتراضي لا يمكن تعطيله" }, { status: 403 });
  }

  await sql`
    UPDATE ai_providers SET enabled = ${enabled ? 1 : 0}
    WHERE tenant_id = ${session.tenantId} AND provider = ${row.provider}`;

  await appendAudit(sql, {
    tenantId: session.tenantId,
    kind: "إعدادات",
    text: `${enabled ? "تفعيل" : "تعطيل"} مزود ${row.label} (${row.provider} · ${row.model}) — نطاق ${row.scope === "workspace" ? "مساحة العمل" : "قضية محددة"}`,
    actor: `${session.name} — الخبير`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
});
