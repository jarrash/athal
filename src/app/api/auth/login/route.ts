import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifyPassword } from "@/lib/crypto";
import { createChallenge } from "@/lib/stepup";
import { handler } from "@/lib/api";

/**
 * Step 1 of sign-in: credentials. Never signs a session by itself —
 * OTP (step 2) is mandatory by design. Returns an OTP challenge id.
 * ملاحظة عرض توضيحي: لا يوجد تكامل رسائل نصية بعد، لذا يُعاد الرمز في
 * الاستجابة كـ devCode ويُعرض للمستخدم. يُستبدل بقناة حقيقية قبل الإطلاق.
 */
export const POST = handler(async (req: NextRequest) => {
  const { email, password } = await req.json();
  const sql = await db();
  const [user] = (await sql`
    SELECT * FROM users WHERE email = ${String(email ?? "").trim().toLowerCase()} AND status = 'active'`) as
    { id: string; tenant_id: string; name: string; role: string; license_no: string | null; password_hash: string }[];

  if (!user || !verifyPassword(String(password ?? ""), user.password_hash)) {
    return NextResponse.json(
      { error: "بيانات الدخول غير صحيحة — المحاولات الفاشلة تُسجَّل" },
      { status: 401 }
    );
  }

  const session = {
    userId: user.id,
    tenantId: user.tenant_id,
    name: user.name,
    role: user.role,
    licenseNo: user.license_no,
  };
  const challenge = await createChallenge(sql, session, "login", "تسجيل الدخول إلى مساحة العمل");
  return NextResponse.json({
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    devCode: challenge.code,
  });
});
