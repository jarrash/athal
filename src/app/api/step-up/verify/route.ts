import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checkChallenge, issueStepUpToken } from "@/lib/stepup";
import { handler, requireSession } from "@/lib/api";

/** Verify a step-up challenge → returns a short-lived single-use token. */
export const POST = handler(async (req: NextRequest) => {
  const session = await requireSession(req);
  const { challengeId, code, actionLabel } = await req.json();
  const handle = db();

  const result = checkChallenge(handle, session, String(challengeId ?? ""), String(code ?? ""));
  if (!result.ok) {
    const messages: Record<string, string> = {
      expired: "انتهت صلاحية الرمز — افتح تحديًا جديدًا",
      locked: "قُفل الاعتماد بعد ٣ محاولات فاشلة — أُبلغ مشرف المنصة",
      wrong_code: `الرمز غير صحيح${result.attemptsLeft ? ` — تبقى ${result.attemptsLeft} محاولات` : ""}`,
      not_found: "التحدي غير موجود أو منتهٍ",
    };
    return NextResponse.json(
      { error: messages[result.error], code: result.error },
      { status: 401 }
    );
  }

  const token = await issueStepUpToken(handle, session, String(actionLabel ?? ""));
  return NextResponse.json({ token });
});
