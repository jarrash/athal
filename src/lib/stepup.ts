import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import type { Sql } from "postgres";
import { otpCode } from "./crypto";
import { sessionSecret, type Session } from "./session";
import { appendAudit } from "./audit";

/**
 * Step-up authentication — the platform's core compliance control.
 * Every critical action (approving an AI suggestion, exporting a report)
 * requires a fresh OTP challenge; the verified challenge yields a short-lived,
 * SINGLE-USE token that the critical-action endpoint re-verifies server-side.
 * The server never trusts a client-side "user passed the modal" flag.
 */

const STEP_UP_TTL_SECONDS = 120;
const MAX_ATTEMPTS = 3;
export const CHALLENGE_TTL_MS = 90_000;

export async function createChallenge(
  sql: Sql,
  session: Session,
  purpose: "login" | "step_up",
  actionLabel: string | null
) {
  const id = randomUUID();
  const code = otpCode();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  await sql`
    INSERT INTO challenges (id, user_id, purpose, action_label, code, expires_at, created_at)
    VALUES (${id}, ${session.userId}, ${purpose}, ${actionLabel}, ${code}, ${expiresAt}, ${new Date().toISOString()})`;
  return { id, code, expiresAt };
}

export type ChallengeResult =
  | { ok: true }
  | { ok: false; error: "expired" | "locked" | "wrong_code" | "not_found"; attemptsLeft?: number };

export async function checkChallenge(
  sql: Sql,
  session: Session,
  challengeId: string,
  code: string
): Promise<ChallengeResult> {
  const rows = await sql`
    SELECT * FROM challenges WHERE id = ${challengeId} AND user_id = ${session.userId}`;
  const ch = rows[0] as
    | { id: string; code: string; attempts: number; status: string; expires_at: string; action_label: string | null; purpose: string }
    | undefined;
  if (!ch || ch.status === "verified") return { ok: false, error: "not_found" };
  if (ch.status === "locked") return { ok: false, error: "locked" };
  if (new Date(ch.expires_at).getTime() < Date.now()) {
    await sql`UPDATE challenges SET status = 'expired' WHERE id = ${ch.id}`;
    return { ok: false, error: "expired" };
  }
  if (ch.code !== code) {
    const attempts = ch.attempts + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    await sql`UPDATE challenges SET attempts = ${attempts}, status = ${locked ? "locked" : "pending"} WHERE id = ${ch.id}`;
    if (locked) {
      // Lock + notify: written to the tenant audit log for the platform admin.
      await appendAudit(sql, {
        tenantId: session.tenantId,
        kind: "أمان",
        text: `قفل مصادقة معززة بعد ${MAX_ATTEMPTS} محاولات فاشلة — ${ch.action_label ?? ch.purpose}`,
        actor: session.name,
      });
      return { ok: false, error: "locked" };
    }
    return { ok: false, error: "wrong_code", attemptsLeft: MAX_ATTEMPTS - attempts };
  }
  await sql`UPDATE challenges SET status = 'verified' WHERE id = ${ch.id}`;
  return { ok: true };
}

/** Issue a short-lived single-use token after a verified step-up challenge. */
export async function issueStepUpToken(
  sql: Sql,
  session: Session,
  actionLabel: string
): Promise<string> {
  const jti = randomUUID();
  await sql`INSERT INTO step_up_tokens (jti, used) VALUES (${jti}, 0)`;
  return new SignJWT({ sub: session.userId, act: actionLabel, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STEP_UP_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

/**
 * Server-side re-verification for critical-action endpoints.
 * Consumes the token (single use). Returns the signed action label, or null.
 */
export async function consumeStepUpToken(
  sql: Sql,
  session: Session,
  token: string | null
): Promise<{ actionLabel: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (payload.sub !== session.userId || typeof payload.jti !== "string") return null;
    const consumed = await sql`
      UPDATE step_up_tokens SET used = 1 WHERE jti = ${payload.jti} AND used = 0 RETURNING jti`;
    if (consumed.length !== 1) return null;
    return { actionLabel: String(payload.act ?? "") };
  } catch {
    return null;
  }
}
