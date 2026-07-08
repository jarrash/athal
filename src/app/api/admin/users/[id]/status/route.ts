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
  const sql = await db();

  const [user] = (await sql`
    SELECT * FROM users WHERE id = ${id} AND tenant_id = ${session.tenantId}`) as
    { id: string; name: string; role: string; status: string }[];
  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  if (action === "suspend") {
    if (user.role === "systemic_rep") {
      const [{ n: activeReps }] = await sql`
        SELECT count(*)::int AS n FROM users
        WHERE tenant_id = ${session.tenantId} AND role = 'systemic_rep' AND status = 'active'`;
      if (activeReps <= 1) {
        return NextResponse.json(
          { error: "لا يمكن إيقاف الممثل النظامي الوحيد — يجب بقاء ممثل نظامي نشط واحد على الأقل" },
          { status: 409 }
        );
      }
    }
    await sql`UPDATE users SET status = 'suspended' WHERE id = ${user.id}`;
  } else if (action === "reactivate") {
    // Reactivation restores the prior role/scope exactly (we never mutated them).
    await sql`UPDATE users SET status = 'active' WHERE id = ${user.id}`;
  } else {
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  }

  await appendAudit(sql, {
    tenantId: session.tenantId,
    kind: "إدارة",
    text: `${action === "suspend" ? "إيقاف وصول" : "إعادة تفعيل"} العضو ${user.name} — الحالة: ${user.status} ← ${action === "suspend" ? "suspended" : "active"}`,
    actor: session.name,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
});
