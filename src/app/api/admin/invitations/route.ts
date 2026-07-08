import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler, requireAdmin, requireSession } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/status";

const INVITE_TTL_HOURS = 72;

/** Invite a member. External consultants require an expiry date (time-boxed). */
export const POST = handler(async (req: NextRequest) => {
  const session = await requireSession(req);
  requireAdmin(session);
  const { name, email, role, department, consultantExpiresAt } = await req.json();
  const handle = db();

  if (!name || !email || !ROLE_LABEL[String(role)]) {
    return NextResponse.json({ error: "الاسم والبريد والدور مطلوبة" }, { status: 400 });
  }
  if (role === "external_consultant" && !consultantExpiresAt) {
    return NextResponse.json(
      { error: "تاريخ انتهاء الوصول إلزامي للاستشاري الخارجي" },
      { status: 400 }
    );
  }

  const id = randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000).toISOString();
  handle
    .prepare(
      `INSERT INTO invitations (id, tenant_id, name, email, role, department, status, expires_at, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(id, session.tenantId, String(name), String(email), String(role), department ? String(department) : null, "pending", expiresAt, session.userId, new Date().toISOString());

  appendAudit(handle, {
    tenantId: session.tenantId,
    kind: "إدارة",
    text: `دعوة عضو جديد: ${name} (${email}) — الدور: ${ROLE_LABEL[String(role)]} — تنتهي الدعوة خلال ${INVITE_TTL_HOURS} ساعة`,
    actor: session.name,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, id, expiresAt });
});
