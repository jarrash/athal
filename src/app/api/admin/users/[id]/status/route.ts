import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler, requireAdmin, requireSession } from "@/lib/api";

/**
 * Suspend / reactivate a member. Hard rule from the spec: there must always
 * remain at least one active systemic representative in the tenant — the sole
 * active rep can never be suspended (including by themself).
 */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession(req);
  requireAdmin(session);
  const { id } = await ctx.params;
  const { action } = await req.json();
  const handle = db();

  const user = handle
    .prepare("SELECT * FROM users WHERE id = ? AND tenant_id = ?")
    .get(id, session.tenantId) as
    | { id: string; name: string; role: string; status: string }
    | undefined;
  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  if (action === "suspend") {
    if (user.role === "systemic_rep") {
      const activeReps = (
        handle
          .prepare(
            "SELECT COUNT(*) AS n FROM users WHERE tenant_id = ? AND role = 'systemic_rep' AND status = 'active'"
          )
          .get(session.tenantId) as { n: number }
      ).n;
      if (activeReps <= 1) {
        return NextResponse.json(
          { error: "لا يمكن إيقاف الممثل النظامي الوحيد — يجب بقاء ممثل نظامي نشط واحد على الأقل" },
          { status: 409 }
        );
      }
    }
    handle.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(user.id);
  } else if (action === "reactivate") {
    // Reactivation restores the prior role/scope exactly (we never mutated them).
    handle.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(user.id);
  } else {
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  }

  appendAudit(handle, {
    tenantId: session.tenantId,
    kind: "إدارة",
    text: `${action === "suspend" ? "إيقاف وصول" : "إعادة تفعيل"} العضو ${user.name} — الحالة: ${user.status} ← ${action === "suspend" ? "suspended" : "active"}`,
    actor: session.name,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
});
