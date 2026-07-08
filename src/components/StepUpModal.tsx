"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Step-up authentication (OTP) modal — shown for EVERY critical action
 * (approving an AI suggestion, exporting a report). The modal only collects
 * the code; the actual authorization is the single-use token the server
 * issues after verifying the challenge, which the caller must attach to the
 * critical-action request.
 */
export default function StepUpModal({
  actionLabel,
  onToken,
  onCancel,
}: {
  actionLabel: string;
  onToken: (token: string) => void;
  onCancel: () => void;
}) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(90);

  const openChallenge = useCallback(async () => {
    setError(null);
    setDigits([]);
    setSecondsLeft(90);
    const res = await fetch("/api/step-up/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionLabel }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "تعذر فتح التحدي");
      return;
    }
    setChallengeId(data.challengeId);
    setDevCode(data.devCode ?? null);
  }, [actionLabel]);

  useEffect(() => {
    openChallenge();
  }, [openChallenge]);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [challengeId]);

  const submit = useCallback(
    async (code: string) => {
      if (!challengeId || busy) return;
      setBusy(true);
      const res = await fetch("/api/step-up/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code, actionLabel }),
      });
      const data = await res.json();
      setBusy(false);
      if (res.ok) {
        onToken(data.token);
        return;
      }
      if (data.code === "locked") {
        setLocked(true);
        setError(data.error);
        return;
      }
      setDigits([]);
      setError(data.error ?? "تعذر التحقق");
    },
    [challengeId, busy, actionLabel, onToken]
  );

  const press = (n: string) => {
    if (locked || busy) return;
    setDigits((d) => {
      if (d.length >= 6) return d;
      const next = [...d, n];
      if (next.length === 6) submit(next.join(""));
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(19,44,44,.55)] backdrop-blur-[2px]">
      <div role="dialog" aria-modal className="fade-up flex w-[420px] flex-col rounded-[2px] border border-ink-border bg-paper shadow-modal">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[2px] bg-ink text-[13px] text-gold">🔒</span>
          <div className="flex flex-col gap-px">
            <span className="text-[14px] font-bold text-t1">تأكيد الهوية — إجراء حرج</span>
            <span className="text-[10.5px] text-t4">مصادقة معززة مطلوبة في كل مرة</span>
          </div>
          <button onClick={onCancel} className="ms-auto cursor-pointer text-[14px] text-t4 hover:text-t1" aria-label="إلغاء">✕</button>
        </div>
        <div className="flex flex-col gap-3.5 px-5 py-[18px]">
          <div className="flex flex-col gap-1 rounded-[2px] border border-line bg-white px-3 py-2.5">
            <span className="text-[10px] font-bold text-t3">الإجراء المطلوب توقيعه</span>
            <span className="text-[12px] font-semibold text-t1">{actionLabel}</span>
          </div>
          <div className="flex justify-center gap-[7px]" dir="ltr">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`mono-ltr inline-flex h-11 w-10 items-center justify-center rounded-[2px] bg-white text-[17px] font-semibold text-t1 ${
                  digits.length === i && !locked ? "border-2 border-ink" : "border border-[#c9c4b4]"
                }`}
              >
                {digits[i] != null ? "•" : ""}
              </span>
            ))}
          </div>
          {!locked && (
            <div className="grid grid-cols-5 gap-1.5" dir="ltr">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((n) => (
                <button
                  key={n}
                  onClick={() => press(n)}
                  className="mono-ltr cursor-pointer rounded-[2px] border border-[#c9c4b4] bg-white py-[9px] text-[14px] font-semibold text-t1 hover:bg-chip"
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {error && (
            <div className="rounded-[2px] border border-danger-border bg-danger-bg px-3 py-2 text-[11px] font-semibold text-danger">
              {error}
              {locked && (
                <button onClick={onCancel} className="ms-2 cursor-pointer underline">إغلاق</button>
              )}
            </div>
          )}
          {!locked && (
            <div className="flex items-center justify-between text-[10px] text-t4">
              <button onClick={openChallenge} className="cursor-pointer underline hover:text-t1">
                إعادة إرسال الرمز
              </button>
              <span>
                انتهاء الرمز خلال <span className="mono-ltr">{secondsLeft}s</span>
              </span>
            </div>
          )}
          {devCode && !locked && (
            <span className="text-center text-[10px] text-t4">
              وضع العرض التوضيحي — الرمز: <span className="mono-ltr font-semibold text-t2">{devCode}</span> · يُقيَّد التوقيع مع بصمة الجهاز وعنوان الشبكة
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
