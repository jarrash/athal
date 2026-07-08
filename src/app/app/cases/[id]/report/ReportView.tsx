"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Card, Chip, CitationChip, Mono } from "@/components/ui";
import StepUpModal from "@/components/StepUpModal";
import { useToast } from "@/components/Toast";
import { arabicDigits } from "@/lib/format";

export type ConclusionRow = {
  id: string;
  number: string;
  sectionLabel: string;
  sectionTitle: string;
  text: string;
  status: "approved" | "pending";
  citations: string[];
  trace: { considered: string; excluded: string; rationale: string } | null;
  approvedBy: string | null;
};

/** Render conclusion text, replacing {دليل-XXX} placeholders with citation chips. */
function renderText(text: string, extraCitations: string[]): ReactNode[] {
  const parts = text.split(/(\{[^}]+\})/g);
  const nodes: ReactNode[] = parts.map((p, i) => {
    const m = p.match(/^\{([^}]+)\}$/);
    return m ? <CitationChip key={i} refCode={m[1]} /> : <span key={i}>{p}</span>;
  });
  const inline = new Set(
    (text.match(/\{([^}]+)\}/g) ?? []).map((s) => s.slice(1, -1))
  );
  extraCitations
    .filter((c) => !inline.has(c))
    .forEach((c, i) => nodes.push(<CitationChip key={`extra-${i}`} refCode={c} />));
  return nodes;
}

export default function ReportView({
  caseId,
  conclusions,
  evidenceOptions,
}: {
  caseId: string;
  conclusions: ConclusionRow[];
  evidenceOptions: { ref: string; id: string; title: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [traceOpen, setTraceOpen] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const blockers = conclusions.filter((c) => c.citations.length === 0);
  const exportBlocked = blockers.length > 0;

  async function cite(conclusionId: string, ref: string) {
    const res = await fetch(`/api/conclusions/${conclusionId}/cite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    });
    const data = await res.json();
    setPickerFor(null);
    if (!res.ok) {
      toast(data.error ?? "تعذر إدراج الاستشهاد");
      return;
    }
    toast(data.exportBlocked ? "أُدرج الاستشهاد" : "أُدرج الاستشهاد — التصدير متاح الآن");
    router.refresh();
  }

  async function doExport(token: string) {
    const res = await fetch(`/api/cases/${caseId}/report/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-step-up-token": token },
      body: JSON.stringify({ format: "PDF" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "رفض الخادم التصدير");
      router.refresh();
      return;
    }
    toast("صُدِّر التقرير — القيد مسجل في سجل الإجراءات");
    router.refresh();
    window.open(data.printUrl, "_blank");
  }

  const sections = [...new Map(conclusions.map((c) => [c.sectionTitle, c])).values()];

  return (
    <main className="fade-up flex flex-col gap-3.5 px-6 py-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-[18px] font-bold text-t1">التقرير الابتدائي</h2>
        <Chip tone="warn">مسودة — حفظ تلقائي</Chip>
        <div className="flex-1" />
        {exportBlocked ? (
          <>
            <Chip tone="danger">
              مانع {arabicDigits(blockers.length)} — استنتاج بلا استشهاد
            </Chip>
            <button disabled className="cursor-not-allowed rounded-[2px] border border-line bg-chip px-[18px] py-2 text-[12px] font-bold text-t4">
              تصدير PDF / DOCX
            </button>
          </>
        ) : (
          <button
            onClick={() => setExporting(true)}
            className="cursor-pointer rounded-[2px] bg-ink px-[18px] py-2 text-[12px] font-bold text-paper shadow-btn hover:bg-ink-hover"
          >
            تصدير PDF / DOCX
          </button>
        )}
      </div>

      {sections.map((section) => (
        <Card key={section.sectionTitle} className="flex flex-col gap-[18px] px-[30px] py-[26px]">
          <div className="flex flex-col gap-1 border-b border-divider pb-3.5">
            <span className="text-[11px] text-t4">{section.sectionLabel}</span>
            <h3 className="m-0 text-[16px] font-bold text-t1">{section.sectionTitle}</h3>
          </div>

          {conclusions
            .filter((c) => c.sectionTitle === section.sectionTitle)
            .map((c) => {
              const uncited = c.citations.length === 0;
              return (
                <div
                  key={c.id}
                  className={`flex flex-col gap-[11px] rounded-[2px] border px-[18px] py-4 ${
                    uncited ? "border-danger-border bg-[#FDFBFA]" : "border-line bg-[#FDFDFB]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-[2px] bg-ink px-2 py-0.5 text-[10px] font-bold text-paper">
                      استنتاج <Mono>{c.number}</Mono>
                    </span>
                    {c.status === "approved" ? (
                      <Chip tone="ok">✓ معتمد — {c.approvedBy}</Chip>
                    ) : (
                      <Chip tone="warn">بانتظار اعتماد الخبير</Chip>
                    )}
                    {c.trace && (
                      <button
                        onClick={() => setTraceOpen(traceOpen === c.id ? null : c.id)}
                        className="ms-auto cursor-pointer rounded-[2px] border border-warn-border bg-warn-bg px-2.5 py-[3px] text-[10.5px] font-semibold text-warn-deep hover:bg-[#eee1bd]"
                      >
                        مسار الاستدلال {traceOpen === c.id ? "▴" : "▾"}
                      </button>
                    )}
                  </div>

                  <p className="m-0 text-[13.5px] leading-loose text-body">
                    {renderText(c.text, c.citations)}
                  </p>

                  {traceOpen === c.id && c.trace && (
                    <div className="fade-up grid grid-cols-3 gap-4 rounded-[2px] border border-line bg-paper px-4 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-t3">الأدلة المدروسة</span>
                        <span className="text-[11px] leading-[1.9] text-t2">{c.trace.considered}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-t3">فرضيات مستبعدة</span>
                        <span className="text-[11px] leading-[1.9] text-t2">{c.trace.excluded}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-t3">التسبيب</span>
                        <span className="text-[11px] leading-[1.9] text-t2">{c.trace.rationale}</span>
                      </div>
                    </div>
                  )}

                  {uncited && pickerFor !== c.id && (
                    <div className="flex items-center gap-2 rounded-[2px] border border-danger-border bg-danger-bg px-3 py-2">
                      <span className="text-[11.5px] font-semibold text-danger">
                        ⚠ استنتاج بلا استشهاد — أضف دليلًا واحدًا على الأقل قبل التصدير (مانع)
                      </span>
                      <button
                        onClick={() => setPickerFor(c.id)}
                        className="ms-auto cursor-pointer rounded-[2px] border border-danger-border bg-white px-[11px] py-1 text-[10.5px] font-bold text-danger hover:bg-danger-bg"
                      >
                        إدراج استشهاد @
                      </button>
                    </div>
                  )}

                  {pickerFor === c.id && (
                    <div className="fade-up flex flex-wrap items-center gap-2 rounded-[2px] border border-line bg-paper px-3.5 py-3">
                      <span className="text-[11px] font-semibold text-t3">اختر الدليل:</span>
                      {evidenceOptions
                        .filter((e) => !c.citations.includes(e.ref))
                        .map((e) => (
                          <button
                            key={e.ref}
                            onClick={() => cite(c.id, e.ref)}
                            title={e.title}
                            className="mono-ltr cursor-pointer rounded-[2px] border border-warn-border bg-warn-bg px-[9px] py-[3px] text-[10px] font-semibold text-warn-deep hover:bg-[#eee1bd]"
                          >
                            {e.ref}
                          </button>
                        ))}
                      <button onClick={() => setPickerFor(null)} className="cursor-pointer text-[10px] text-t4 underline">إلغاء</button>
                    </div>
                  )}

                  {!uncited && c.status === "pending" && (
                    <span className="text-[10.5px] font-semibold text-ok">
                      ✓ الاستشهاد مضاف — زال المانع، والتصدير متاح الآن.
                    </span>
                  )}
                </div>
              );
            })}
        </Card>
      ))}

      <div className="flex items-center gap-2">
        <span className="text-[10.5px] text-t3">
          التصدير يتطلب مصادقة معززة (OTP)، ويتحقق الخادم من مانع الاستشهاد بشكل مستقل قبل توليد الملف.
        </span>
        <Link href={`/app/cases/${caseId}/report/print`} target="_blank" className="text-[10.5px] text-t3 underline hover:text-t1">
          معاينة نسخة الطباعة
        </Link>
      </div>

      {exporting && (
        <StepUpModal
          actionLabel="تصدير التقرير الابتدائي — PDF/DOCX"
          onToken={(token) => {
            setExporting(false);
            doExport(token);
          }}
          onCancel={() => {
            setExporting(false);
            toast("أُلغيت المصادقة — لم يُنفَّذ الإجراء");
          }}
        />
      )}
    </main>
  );
}
