"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mono } from "./ui";

/** Extract the active case id from /app/cases/[id]/... paths. */
function caseIdFrom(pathname: string): string | null {
  const m = pathname.match(/^\/app\/cases\/([^/]+)/);
  return m ? m[1] : null;
}

export default function Sidebar({
  casesCount,
  evidenceCount,
  providerLine,
}: {
  casesCount: number;
  evidenceCount: number;
  providerLine: string;
}) {
  const pathname = usePathname();
  const caseId = caseIdFrom(pathname);
  const caseHref = (leaf: string) => (caseId ? `/app/cases/${caseId}/${leaf}` : "/app/cases");

  const items: { key: string; label: string; href: string; count?: number; needsCase?: boolean }[] = [
    { key: "cases", label: "القضايا", href: "/app/cases", count: casesCount },
    { key: "vault", label: "خزنة الأدلة", href: caseHref("vault"), count: caseId ? evidenceCount : undefined, needsCase: true },
    { key: "copilot", label: "المساعد الذكي", href: caseHref("copilot"), needsCase: true },
    { key: "report", label: "مصنع التقارير", href: caseHref("report"), needsCase: true },
    { key: "log", label: "سجل الإجراءات", href: "/app/log" },
    { key: "settings", label: "الإعدادات", href: "/app/settings" },
  ];

  const isActive = (item: (typeof items)[number]) => {
    if (item.key === "cases") return pathname === "/app/cases";
    if (item.key === "vault") return /\/(vault|evidence)/.test(pathname) && !!caseId;
    if (item.key === "copilot") return pathname.includes("/copilot");
    if (item.key === "report") return pathname.includes("/report");
    if (item.key === "log") return pathname.startsWith("/app/log");
    if (item.key === "settings") return pathname.startsWith("/app/settings") || pathname.startsWith("/app/admin");
    return false;
  };

  return (
    <aside className="ink-grid sticky top-0 flex h-screen w-[230px] flex-none flex-col pb-4">
      <div className="flex items-center gap-[11px] border-b border-ink-hover px-5 pb-4 pt-[18px]">
        <Link href="/app/cases" className="inline-flex rounded-[2px] bg-gold px-3 py-[7px] leading-none">
          <span className="text-[16px] font-bold leading-none text-ink">أثالــــ</span>
        </Link>
        <Mono className="text-[8px] font-medium tracking-[.14em] text-t3d">ATHAL AI</Mono>
      </div>
      <nav className="flex flex-col pt-2.5">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-[11px] border-s-[3px] px-5 py-2.5 text-[13px] transition-colors ${
                active
                  ? "border-gold bg-ink-hover font-bold text-gold"
                  : "border-transparent font-medium text-navtext hover:bg-ink-hover"
              } ${item.needsCase && !caseId ? "opacity-60" : ""}`}
            >
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <Mono className="ms-auto rounded-[2px] bg-ink-hover px-1.5 py-px text-[10px] text-navtext">
                  {item.count}
                </Mono>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <div className="mx-4 flex flex-col gap-1.5 rounded-[2px] border border-ink-border bg-ink-hover px-3.5 py-3">
        <span className="text-[10.5px] font-bold text-gold">🇸🇦 معالجة سيادية — داخل المملكة</span>
        <Mono className="text-start text-[8.5px] text-t3d">{providerLine}</Mono>
      </div>
    </aside>
  );
}
