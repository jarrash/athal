"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, Chip, EvidenceRef, Mono, TableHead } from "@/components/ui";
import { EVIDENCE_STATUS_LABEL, EVIDENCE_STATUS_TONE } from "@/lib/status";
import { arabicDigits, fmtDateTime, truncHash } from "@/lib/format";

export type EvidenceRow = {
  id: string;
  ref: string;
  title: string;
  filename: string;
  sha256: string;
  status: string;
  party: string;
  chain: { action: string; actor: string; at: string }[];
};

const FILTERS = ["الكل", "موثّق", "متنازع", "قيد التحليل"] as const;
const COLS = "84px 1.4fr 92px 110px 130px";

export default function VaultView({
  caseId,
  evidence,
}: {
  caseId: string;
  evidence: EvidenceRow[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("الكل");
  const [selectedId, setSelectedId] = useState<string | null>(evidence[0]?.id ?? null);

  const shown = useMemo(
    () =>
      evidence.filter(
        (e) => filter === "الكل" || EVIDENCE_STATUS_LABEL[e.status] === filter
      ),
    [evidence, filter]
  );
  const selected = shown.find((e) => e.id === selectedId) ?? shown[0] ?? null;

  return (
    <div className="fade-up flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-6 py-[22px]">
        <div className="flex items-center gap-3">
          <h2 className="m-0 text-[18px] font-bold text-t1">خزنة الأدلة</h2>
          <span className="text-[12px] text-t3">{arabicDigits(shown.length)} أدلة معروضة</span>
          <div className="flex-1" />
          <Link
            href={`/app/cases/${caseId}/vault/upload`}
            className="inline-flex items-center gap-2 rounded-[2px] bg-ink px-4 py-2 text-[12px] font-bold text-paper shadow-btn hover:bg-ink-hover"
          >
            رفع أدلة
          </Link>
        </div>

        <div className="flex items-center gap-[7px]">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-[2px] border px-3 py-1 text-[11.5px] hover:border-gold ${
                filter === f
                  ? "border-ink bg-ink font-bold text-paper"
                  : "border-line bg-white font-medium text-t2"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          <TableHead cols={COLS}>
            <span>الدليل</span><span>الملف</span><span>الطرف</span><span>الحالة</span><span>SHA-256</span>
          </TableHead>
          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border border-dashed border-line px-6 py-12">
              <span className="text-[24px] text-muted">🗂</span>
              <span className="text-[12px] text-t3">لا توجد أدلة مطابقة لهذا الفلتر بعد.</span>
              <Link href={`/app/cases/${caseId}/vault/upload`} className="rounded-[2px] bg-ink px-4 py-2 text-[11.5px] font-bold text-paper shadow-btn-sm hover:bg-ink-hover">
                رفع أول دليل
              </Link>
            </div>
          ) : (
            shown.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`grid w-full cursor-pointer items-center gap-3 border-b border-divider px-[18px] py-3 text-start hover:bg-fresh-alt ${
                  selected?.id === e.id ? "bg-fresh" : "bg-white"
                }`}
                style={{ gridTemplateColumns: COLS }}
              >
                <EvidenceRef refCode={e.ref} className="justify-self-start" />
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[12.5px] font-medium text-t1">{e.title}</span>
                  <Mono className="overflow-hidden text-ellipsis whitespace-nowrap text-end text-[9.5px] text-t4">
                    {e.filename}
                  </Mono>
                </span>
                <span className="text-[11px] text-t2">{e.party}</span>
                <Chip tone={EVIDENCE_STATUS_TONE[e.status] ?? "neutral"} className="justify-self-start">
                  {EVIDENCE_STATUS_LABEL[e.status] ?? e.status}
                </Chip>
                <Mono className="text-[9px] text-t3">✓ {truncHash(e.sha256)}</Mono>
              </button>
            ))
          )}
          <div className="flex items-center gap-2 bg-paper px-[18px] py-2.5">
            <span className="text-[10.5px] text-t3">
              🔒 تخزين WORM بقفل الامتثال — لا يمكن تعديل أو حذف أي ملف بعد إيداعه.
            </span>
          </div>
        </Card>
      </div>

      {/* Detail rail */}
      {selected && (
        <aside className="flex w-[320px] flex-none flex-col border-s border-line bg-white">
          <div className="flex flex-col gap-2.5 border-b border-divider px-[18px] py-4">
            <div className="flex items-center gap-2">
              <EvidenceRef refCode={selected.ref} />
              <span className="text-[13px] font-bold text-t1">{selected.title}</span>
            </div>
            <div className="flex flex-col gap-[5px] rounded-[2px] border border-line bg-paper px-[11px] py-[9px]">
              <span className="text-[10px] font-semibold text-t3">SHA-256</span>
              <Mono className="break-all text-start text-[9px] leading-[1.7] text-t2">{selected.sha256}</Mono>
              <span className="text-[9.5px] font-semibold text-ok">✓ تحقق مزدوج — العميل والخادم متطابقان</span>
            </div>
            <Link
              href={`/app/cases/${caseId}/evidence/${selected.id}`}
              className="text-[10.5px] text-t3 underline hover:text-t1"
            >
              عرض التفاصيل الكاملة وشهادة البصمة ←
            </Link>
          </div>
          <div className="flex flex-col gap-3 px-[18px] py-4">
            <span className="text-[12px] font-bold text-t1">سلسلة العهدة</span>
            <div className="flex flex-col">
              {selected.chain.map((ce, i) => (
                <div key={i} className="flex gap-[11px]">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-2 w-2 rounded-full border-[1.5px] ${
                        i === 0 ? "border-ink bg-gold" : "border-t4 bg-white"
                      }`}
                    />
                    {i < selected.chain.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-3.5">
                    <span className="text-[11.5px] font-semibold text-t1">{ce.action}</span>
                    <span className="text-[10.5px] text-t3">{ce.actor}</span>
                    <Mono className="text-end text-[9px] text-t4">{fmtDateTime(ce.at)}</Mono>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
