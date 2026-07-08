import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler, requireDecisionRole, requireSession } from "@/lib/api";

/** Toggle an optional AI provider. The sovereign default is locked on. */
export const POST = handler(async (req: NextRequest) => {
  const session = await requireSession(req);
  requireDecisionRole(session);
  const { provider, enabled } = await req.json();
  const handle = db();

  const row = handle
    .prepare("SELECT * FROM ai_providers WHERE tenant_id = ? AND provider = ?")
    .get(session.tenantId, String(provider ?? "")) as
    | { provider: string; label: string; model: string; locked: number; scope: string }
    | undefined;
  if (!row) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
  if (row.locked) {
    return NextResponse.json({ error: "المزود السيادي الافتراضي لا يمكن تعطيله" }, { status: 403 });
  }

  handle
    .prepare("UPDATE ai_providers SET enabled = ? WHERE tenant_id = ? AND provider = ?")
    .run(enabled ? 1 : 0, session.tenantId, row.provider);

  appendAudit(handle, {
    tenantId: session.tenantId,
    kind: "إعدادات",
    text: `${enabled ? "تفعيل" : "تعطيل"} مزود ${row.label} (${row.provider} · ${row.model}) — نطاق ${row.scope === "workspace" ? "مساحة العمل" : "قضية محددة"}`,
    actor: `${session.name} — الخبير`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
});
