"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Chip, Mono, TableHead } from "@/components/ui";
import StepUpModal from "@/components/StepUpModal";
import { useToast } from "@/components/Toast";
import { OBLIGATION_STATUS_TONE } from "@/lib/status";
import { fmtDateTime } from "@/lib/format";

export type PartyRow = {
  id: string;
  name: string;
  role: string;
  note: string | null;
  confidence: number | null;
  approved: number;
};

export type ObligationRow = {
  id: string;
  clause: string;
  responsible: string;
  status: string;
  refs: { ref: string; evidenceId: string | null }[];
  confidence: number;
  decision: "suggested" | "approved" | "rejected";
  decidedBy: string | null;
  decidedAt: string | null;
};

const PARTY_ROLE_TONE: Record<string, "info" | "danger" | "neutral"> = {
  "مدعي": "info",
  "مدعى عليه": "danger",
};

const COLS = "1.6fr 110px 100px 140px 84px 220px";

export default function CopilotView({
  caseId,
  parties,
  obligations,
}: {
  caseId: string;
  parties: PartyRow[];
  obligations: ObligationRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"parties" | "matrix">("matrix");
  const [pendingApproval, setPendingApproval] = useState<ObligationRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(ob: ObligationRow, decision: string, stepUpToken?: string) {
    setBusyId(ob.id);
    const res = await fetch(`/api/obligations/${ob.id}/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(stepUpToken ? { "x-step-up-token": stepUpToken } : {}),
      },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      toast(data.error ?? "تعذر تنفيذ الإجراء");
      return;
    }
    if (decision === "approved") toast("تم الاعتماد وقُيِّد في سجل الإجراءات");
    else if (decision === "rejected") toast("تم الرفض — البند يبقى ظاهرًا بشطب");
    router.refresh();
  }

  return (
    <main className="fade-up flex min-w-0 flex-col gap-4 px-6 py-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-[18px] font-bold text-t1">المساعد الذكي</h2>
        <span className="text-[12px] text-t3">مخرجات مقترحة — لا تدخل التقرير قبل اعتماد الخبير</span>
      </div>

      <div className="flex gap-0.5 border-b border-line">
        {(
          [
            { key: "parties", label: "الأطراف" },
            { key: "matrix", label: "مصفوفة الالتزامات" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer px-[18px] py-[11px] text-[13px] ${
              tab === t.key
                ? "border-b-2 border-gold font-bold text-t1"
                : "border-b-2 border-transparent font-medium text-t3 hover:text-t1"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "parties" ? (
        <div className="grid grid-cols-3 gap-3.5">
          {parties.map((p) => (
            <Card key={p.id} className="flex flex-col gap-2.5 px-[18px] py-4">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-bold text-t1">{p.name}</span>
                <Chip tone={PARTY_ROLE_TONE[p.role] ?? "neutral"}>{p.role}</Chip>
              </div>
              <span className="text-[11.5px] leading-[1.7] text-t3">{p.note}</span>
              <div className="flex items-center gap-2 border-t border-divider pt-2.5">
                <Mono className="text-[10px] text-t1">{p.confidence}%</Mono>
                <div className="h-[3px] flex-1 -scale-x-100 overflow-hidden rounded-[2px] bg-divider">
                  <div className="h-full bg-ink" style={{ width: `${p.confidence}%` }} />
                </div>
                {p.approved ? <span className="text-[10px] font-semibold text-ok">معتمد ✓</span> : <span className="text-[10px] font-semibold text-warn">بانتظار الاعتماد</span>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <TableHead cols={COLS}>
            <span>البند</span><span>المسؤول</span><span>الحالة</span><span>الدليل</span><span>الثقة</span><span>قرار الخبير</span>
          </TableHead>
          {obligations.map((o) => (
            <div
              key={o.id}
              className={`grid items-center gap-3 border-b border-divider px-[18px] py-[13px] ${
                o.decision === "approved" ? "bg-[#FBFDF9]" : o.decision === "rejected" ? "bg-[#FBFAF8]" : "bg-white"
              }`}
              style={{ gridTemplateColumns: COLS }}
            >
              <span
                className={`text-[12.5px] leading-[1.7] text-t1 ${
                  o.decision === "rejected" ? "line-through opacity-55" : ""
                }`}
              >
                {o.clause}
              </span>
              <span className="text-[11.5px] text-t2">{o.responsible}</span>
              <Chip tone={OBLIGATION_STATUS_TONE[o.status] ?? "neutral"} className="justify-self-start">{o.status}</Chip>
              <span className="flex flex-wrap gap-[5px]">
                {o.refs.map((r) =>
                  r.evidenceId ? (
                    <Link
                      key={r.ref}
                      href={`/app/cases/${caseId}/evidence/${r.evidenceId}`}
                      className="mono-ltr rounded-[2px] border border-warn-border bg-warn-bg px-[7px] py-[2px] text-[9.5px] font-semibold text-warn-deep hover:bg-[#eee1bd]"
                    >
                      {r.ref}
                    </Link>
                  ) : (
                    <Mono key={r.ref} className="rounded-[2px] border border-warn-border bg-warn-bg px-[7px] py-[2px] text-[9.5px] font-semibold text-warn-deep">{r.ref}</Mono>
                  )
                )}
                {o.refs.length === 0 && (
                  <span className="rounded-[2px] border border-danger-border bg-danger-bg px-[7px] py-[2px] text-[9.5px] font-semibold text-danger">بلا مصدر</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Mono className="text-[10px] text-t1">{o.confidence}%</Mono>
                <div className="h-[3px] w-[30px] -scale-x-100 overflow-hidden rounded-[2px] bg-divider">
                  <div className={`h-full ${o.confidence >= 70 ? "bg-ink" : "bg-danger"}`} style={{ width: `${o.confidence}%` }} />
                </div>
              </span>
              <span className="flex flex-wrap items-center gap-[5px]">
                {o.decision === "suggested" && (
                  <>
                    <button
                      disabled={busyId === o.id}
                      onClick={() => setPendingApproval(o)}
                      className="cursor-pointer rounded-[2px] bg-ink px-[11px] py-[5px] text-[10.5px] font-bold text-paper shadow-btn-sm hover:bg-ink-hover disabled:opacity-60"
                    >
                      اعتماد
                    </button>
                    <button
                      disabled={busyId === o.id}
                      onClick={() => decide(o, "rejected")}
                      className="cursor-pointer rounded-[2px] border border-danger-border bg-white px-[11px] py-[5px] text-[10.5px] text-danger hover:bg-danger-bg disabled:opacity-60"
                    >
                      رفض
                    </button>
                  </>
                )}
                {o.decision === "approved" && (
                  <>
                    <Chip tone="ok">
                      ✓ معتمد — {o.decidedBy}
                      {o.decidedAt && <Mono className="text-[8px] text-t3">{fmtDateTime(o.decidedAt)}</Mono>}
                    </Chip>
                    <button onClick={() => decide(o, "suggested")} className="cursor-pointer text-[9.5px] text-t4 underline">تراجع</button>
                  </>
                )}
                {o.decision === "rejected" && (
                  <>
                    <Chip tone="danger">مرفوض — مسجَّل</Chip>
                    <button onClick={() => decide(o, "suggested")} className="cursor-pointer text-[9.5px] text-t4 underline">تراجع</button>
                  </>
                )}
              </span>
            </div>
          ))}
          <div className="bg-paper px-[18px] py-2.5">
            <span className="text-[10.5px] text-t3">
              الاعتماد يتطلب مصادقة معززة (OTP) — والقرارات تُقيَّد فورًا في سجل الإجراءات.
            </span>
          </div>
        </Card>
      )}

      {pendingApproval && (
        <StepUpModal
          actionLabel={`اعتماد: ${pendingApproval.clause.slice(0, 40)}…`}
          onToken={(token) => {
            const ob = pendingApproval;
            setPendingApproval(null);
            decide(ob, "approved", token);
          }}
          onCancel={() => {
            setPendingApproval(null);
            toast("أُلغيت المصادقة — لم يُنفَّذ الإجراء");
          }}
        />
      )}
    </main>
  );
}
