import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { createChallenge } from "@/lib/stepup";
import { handler, requireSession } from "@/lib/api";

/** Open a step-up (OTP) challenge for a named critical action. */
export const POST = handler(async (req: NextRequest) => {
  const session = await requireSession(req);
  const { actionLabel } = await req.json();
  const sql = await db();
  const challenge = await createChallenge(sql, session, "step_up", String(actionLabel ?? "إجراء حرج"));
  return NextResponse.json({
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    devCode: challenge.code,
  });
});
