"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mono } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextUrl = params.get("next") ?? "/app/cases";

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setChallengeId(data.challengeId);
    setDevCode(data.devCode ?? null);
    setStep("otp");
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, code }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error);
      setCode("");
      return;
    }
    router.push(nextUrl);
  }

  const input =
    "w-full rounded-[2px] border border-line bg-white px-3 py-2.5 text-[13px] text-t1 outline-none focus:border-gold";

  return (
    <div className="ink-grid flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="flex w-[400px] max-w-full flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-2.5">
          <span className="inline-flex rounded-[2px] bg-gold px-4 py-2 leading-none">
            <span className="text-[22px] font-bold leading-none text-ink">أثالــــ</span>
          </span>
          <span className="text-[12.5px] text-navtext">خبرة راسخة، ورأي موثّق</span>
        </div>

        <div className="flex w-full flex-col gap-4 rounded-[2px] border border-line bg-paper p-6 shadow-modal">
          {step === "credentials" ? (
            <form onSubmit={submitCredentials} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-t2">البريد الإلكتروني</label>
                <input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mono-ltr`} placeholder="name@office.sa" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-t2">كلمة المرور</label>
                  <span className="cursor-pointer text-[10.5px] text-t3 underline hover:text-t1">نسيت كلمة المرور؟</span>
                </div>
                <input dir="ltr" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
              </div>
              {error && <p className="m-0 rounded-[2px] border border-danger-border bg-danger-bg px-3 py-2 text-[11px] font-semibold text-danger">{error}</p>}
              <button disabled={busy} className="cursor-pointer rounded-[2px] bg-ink px-4 py-3 text-[13px] font-bold text-paper shadow-btn hover:bg-ink-hover disabled:opacity-60">
                متابعة — رمز تحقق لمرة واحدة
              </button>
              <div className="flex items-center gap-3 text-[10.5px] text-t4">
                <span className="h-px flex-1 bg-line" />أو<span className="h-px flex-1 bg-line" />
              </div>
              <button type="button" disabled className="flex cursor-not-allowed items-center justify-center gap-2 rounded-[2px] border border-line bg-white px-4 py-3 text-[12.5px] font-semibold text-muted">
                الدخول عبر نفاذ الوطني الموحد
                <span className="rounded-[2px] border border-chip-border bg-chip px-1.5 py-px text-[9.5px] text-t3">قريبًا</span>
              </button>
              <p className="m-0 text-center text-[10px] text-t4">
                حسابات العرض: <Mono>khalid@athal.sa</Mono> · كلمة المرور <Mono>Athal!Demo1447</Mono>
              </p>
            </form>
          ) : (
            <form onSubmit={submitOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-bold text-t1">رمز التحقق لمرة واحدة</span>
                <span className="text-[11px] text-t3">أُرسل رمز من ٦ أرقام — المصادقة الثنائية إلزامية</span>
              </div>
              <input
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${input} mono-ltr text-center text-[20px] tracking-[.5em]`}
                placeholder="••••••"
              />
              {devCode && (
                <p className="m-0 text-center text-[10px] text-t4">
                  وضع العرض التوضيحي — الرمز: <Mono className="font-semibold text-t2">{devCode}</Mono>
                </p>
              )}
              {error && <p className="m-0 rounded-[2px] border border-danger-border bg-danger-bg px-3 py-2 text-[11px] font-semibold text-danger">{error}</p>}
              <button disabled={busy || code.length !== 6} className="cursor-pointer rounded-[2px] bg-ink px-4 py-3 text-[13px] font-bold text-paper shadow-btn hover:bg-ink-hover disabled:opacity-60">
                دخول
              </button>
              <button type="button" onClick={() => { setStep("credentials"); setError(null); setCode(""); }} className="cursor-pointer text-[10.5px] text-t3 underline hover:text-t1">
                رجوع
              </button>
            </form>
          )}
        </div>

        <p className="m-0 max-w-[400px] text-center text-[10px] leading-relaxed text-t3d">
          🔒 جلسة سرية — تُغلق تلقائيًا بعد ١٥ دقيقة من الخمول، وتُقيَّد جميع عمليات الدخول في سجل التدقيق.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
