"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mono } from "./ui";

export type CaseMini = {
  id: string;
  number: string;
  title: string;
  deadlineLabel: string | null;
};

export default function Topbar({
  user,
  cases,
  dateLine,
}: {
  user: { name: string; title: string; licenseNo: string | null };
  cases: CaseMini[];
  dateLine: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const caseId = pathname.match(/^\/app\/cases\/([^/]+)/)?.[1] ?? null;
  const activeCase = caseId ? cases.find((c) => c.id === caseId) : null;

  const initials = user.name
    .replace(/^(م|د|أ)\.\s*/, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="flex h-[54px] flex-none items-center gap-3.5 border-b border-line bg-white px-6">
      {activeCase ? (
        <>
          <Link
            href="/app/cases"
            className="flex items-center gap-2 rounded-[2px] border border-line bg-paper px-3 py-1.5 hover:border-gold"
          >
            <Mono className="text-[11.5px] font-semibold text-t1">{activeCase.number}</Mono>
            <span className="text-[11.5px] text-t2">{activeCase.title}</span>
            <span className="text-[10px] text-t4">✕</span>
          </Link>
          {activeCase.deadlineLabel && (
            <span className="inline-flex items-center gap-[7px] rounded-[2px] border border-warn-border bg-warn-bg px-[11px] py-[5px] text-[11px] font-semibold text-warn-deep">
              الموعد القضائي {activeCase.deadlineLabel}
            </span>
          )}
        </>
      ) : (
        <>
          <div className="flex h-[34px] max-w-[420px] flex-1 items-center gap-2 rounded-[2px] border border-line bg-paper px-3">
            <input
              className="w-full bg-transparent text-[12px] text-t1 outline-none placeholder:text-t4"
              placeholder="ابحث برقم القضية أو اسم الطرف أو رقم الدليل…"
            />
          </div>
          <span className="text-[11px] text-t3">{dateLine}</span>
        </>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-ink text-[11px] font-bold text-gold shadow-[0_0_0_1px_#C8A84B]">
          {initials}
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-[12px] font-bold leading-tight text-t1">{user.name}</span>
          <span className="text-[10px] leading-tight text-t4">
            {user.title}
            {user.licenseNo && (
              <>
                {" "}· رخصة <Mono>{user.licenseNo}</Mono>
              </>
            )}
          </span>
        </div>
        <button
          onClick={logout}
          className="ms-2 cursor-pointer rounded-[2px] border border-line px-2 py-1 text-[10px] text-t3 hover:border-gold hover:text-t1"
        >
          خروج
        </button>
      </div>
    </header>
  );
}
