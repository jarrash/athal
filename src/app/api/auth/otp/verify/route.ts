import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checkChallenge } from "@/lib/stepup";
import { signSession, SESSION_COOKIE, type Session } from "@/lib/session";
import { appendAudit } from "@/lib/audit";
import { clientIp, handler } from "@/lib/api";

/** Step 2 of sign-in: verify the OTP challenge, then issue the session. */
export const POST = handler(async (req: NextRequest) => {
  const { challengeId, code } = await req.json();
  const handle = db();

  const ch = handle
    .prepare("SELECT user_id FROM challenges WHERE id = ? AND purpose = 'login'")
    .get(String(challengeId ?? "")) as { user_id: string } | undefined;
  const user = ch
    ? (handle.prepare("SELECT * FROM users WHERE id = ? AND status = 'active'").get(ch.user_id) as
        | { id: string; tenant_id: string; name: string; role: string; license_no: string | null }
        | undefined)
    : undefined;
  if (!ch || !user) {
    return NextResponse.json({ error: "التحدي غير موجود أو منتهٍ" }, { status: 400 });
  }

  const session: Session = {
    userId: user.id,
    tenantId: user.tenant_id,
    name: user.name,
    role: user.role,
    licenseNo: user.license_no,
  };
  const result = checkChallenge(handle, session, String(challengeId), String(code ?? ""));
  if (!result.ok) {
    const messages: Record<string, string> = {
      expired: "انتهت صلاحية الرمز — أعد المحاولة",
      locked: "قُفل الدخول بعد ٣ محاولات فاشلة — أُبلغ مشرف المنصة",
      wrong_code: `الرمز غير صحيح${result.attemptsLeft ? ` — تبقى ${result.attemptsLeft} محاولات` : ""}`,
      not_found: "التحدي غير موجود أو منتهٍ",
    };
    return NextResponse.json({ error: messages[result.error] }, { status: 401 });
  }

  handle
    .prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
    .run(new Date().toISOString(), user.id);
  appendAudit(handle, {
    tenantId: user.tenant_id,
    kind: "دخول",
    text: "تسجيل دخول ناجح — مصادقة ثنائية (كلمة مرور + OTP)",
    actor: user.name,
    ip: clientIp(req),
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
});
