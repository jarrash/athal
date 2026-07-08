import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type Session } from "./session";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireSession(req: NextRequest): Promise<Session> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) throw new ApiError(401, "الجلسة منتهية — سجّل الدخول مجددًا");
  return session;
}

/** Roles allowed to take case-work decisions (approve/reject/cite/export). */
export function requireDecisionRole(session: Session) {
  if (["read_only", "external_consultant", "platform_support"].includes(session.role)) {
    throw new ApiError(403, "صلاحيتك للقراءة فقط — لا يمكنك تنفيذ هذا الإجراء");
  }
}

export function requireAdmin(session: Session) {
  if (session.role !== "systemic_rep") {
    throw new ApiError(403, "هذا الإجراء يتطلب صلاحية الممثل النظامي");
  }
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Wrap a route handler with uniform error handling. */
export function handler<T extends unknown[]>(
  fn: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await fn(req, ...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "خطأ غير متوقع في الخادم" }, { status: 500 });
    }
  };
}
