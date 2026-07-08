"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const ToastContext = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <div className="fade-up fixed bottom-[22px] start-[22px] z-50 flex items-center gap-2.5 rounded-[2px] border border-ink-border bg-ink px-[18px] py-3 shadow-[6px_6px_0_rgba(0,0,0,.25)]">
          <span className="text-[13px] text-gold">✓</span>
          <span className="text-[12px] font-semibold text-paper">{msg}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
