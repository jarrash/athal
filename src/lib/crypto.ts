import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Tamper-evidence chain: eventHash = H(prevEventHash + payload) */
export function chainHash(prevHash: string | null, payload: unknown): string {
  return sha256Hex((prevHash ?? "GENESIS") + JSON.stringify(payload));
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return derived.length === expectedBuf.length && timingSafeEqual(derived, expectedBuf);
}

/** 6-digit OTP code (login + step-up challenges). */
export function otpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
