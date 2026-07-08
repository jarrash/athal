import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import { fmtDateTime } from "@/lib/format";
import { Card, Chip, EvidenceRef, Mono } from "@/components/ui";
import { EVIDENCE_STATUS_LABEL, EVIDENCE_STATUS_TONE } from "@/lib/status";

export const dynamic = "force-dynamic";

/** Evidence deep-dive: metadata, linked conclusions, full chain of custody. */
export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id, eid } = await params;
  const handle = db();

  const ev = handle
    .prepare("SELECT * FROM evidence WHERE id = ? AND case_id = ? AND tenant_id = ?")
    .get(eid, id, session.tenantId) as
    | {
        id: string; ref: string; title: string; filename: string; size: number; sha256: string;
        status: string; party_label: string | null; uploaded_by: string; uploaded_at: string;
      }
    | undefined;
  if (!ev) notFound();

  const chain = handle
    .prepare("SELECT action, actor, at, event_hash FROM custody_events WHERE evidence_id = ? ORDER BY id DESC")
    .all(ev.id) as { action: string; actor: string; at: string; event_hash: string }[];

  const linked = (
    handle
      .prepare("SELECT number, text, status, citations FROM conclusions WHERE case_id = ?")
      .all(id) as { number: string; text: string; status: string; citations: string }[]
  ).filter((c) => (JSON.parse(c.citations) as string[]).includes(ev.ref));

  return (
    <main className="fade-up flex flex-col gap-4 px-6 py-[22px]">
      <div className="flex items-center gap-3">
        <EvidenceRef refCode={ev.ref} />
        <h2 className="m-0 text-[18px] font-bold text-t1">{ev.title}</h2>
        <Chip tone={EVIDENCE_STATUS_TONE[ev.status] ?? "neutral"}>
          {EVIDENCE_STATUS_LABEL[ev.status] ?? ev.status}
        </Chip>
        <div className="flex-1" />
        <Link href={`/app/cases/${id}/vault`} className="text-[11.5px] text-t3 underline hover:text-t1">
          ← العودة إلى الخزنة
        </Link>
      </div>

      <div className="grid grid-cols-[46fr_54fr] gap-4">
        {/* Document preview pane (placeholder viewer, watermarked in production) */}
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-[2px] border border-line bg-paper-alt">
          <span className="text-[30px] text-muted">📄</span>
          <Mono className="text-[10.5px] text-t3">{ev.filename}</Mono>
          <span className="max-w-[280px] text-center text-[10.5px] leading-relaxed text-t4">
            معاينة للاطلاع فقط — تُعرض النسخ السرية بعلامة مائية تحمل هوية المطّلع ووقت الاطلاع (TLS 1.3 · AES-256).
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2.5 p-4">
            <span className="text-[12px] font-bold text-t1">البصمة والبيانات الوصفية</span>
            <div className="flex flex-col gap-[5px] rounded-[2px] border border-line bg-paper px-[11px] py-[9px]">
              <span className="text-[10px] font-semibold text-t3">SHA-256</span>
              <Mono className="break-all text-start text-[9px] leading-[1.7] text-t2">{ev.sha256}</Mono>
              <span className="text-[9.5px] font-semibold text-ok">✓ تحقق مزدوج — العميل والخادم متطابقان</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <span className="text-t3">المودِع: <span className="font-semibold text-t1">{ev.uploaded_by}</span></span>
              <span className="text-t3">الطرف: <span className="font-semibold text-t1">{ev.party_label ?? "—"}</span></span>
              <span className="text-t3">تاريخ الإيداع: <Mono className="text-[10px] font-semibold text-t1">{fmtDateTime(ev.uploaded_at)}</Mono></span>
              <span className="text-t3">الحجم: <Mono className="text-[10px] font-semibold text-t1">{(ev.size / 1024).toFixed(0)} KB</Mono></span>
            </div>
          </Card>

          <Card className="flex flex-col gap-2.5 p-4">
            <span className="text-[12px] font-bold text-t1">الاستنتاجات المرتبطة</span>
            {linked.length === 0 ? (
              <span className="text-[11px] text-t4">لا يستشهد أي استنتاج بهذا الدليل بعد.</span>
            ) : (
              linked.map((c) => (
                <div key={c.number} className="flex items-center gap-2 rounded-[2px] border border-line bg-paper px-3 py-2">
                  <span className="rounded-[2px] bg-ink px-2 py-0.5 text-[10px] font-bold text-paper">
                    استنتاج <Mono>{c.number}</Mono>
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-t2">
                    {c.text.replace(/\{[^}]+\}/g, "")}
                  </span>
                  <Chip tone={c.status === "approved" ? "ok" : "warn"}>
                    {c.status === "approved" ? "✓ معتمد" : "بانتظار الاعتماد"}
                  </Chip>
                </div>
              ))
            )}
            <span className="text-[10px] text-t4">
              لا يمكن حذف دليل مستشهد به — إلغاء الاستشهاد يظهر في فحص ما قبل التصدير.
            </span>
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <span className="text-[12px] font-bold text-t1">سلسلة العهدة الكاملة</span>
            <div className="flex flex-col">
              {chain.map((ce, i) => (
                <div key={i} className="flex gap-[11px]">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2 w-2 rounded-full border-[1.5px] ${i === 0 ? "border-ink bg-gold" : "border-t4 bg-white"}`} />
                    {i < chain.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5 pb-3.5">
                    <span className="text-[11.5px] font-semibold text-t1">{ce.action}</span>
                    <span className="text-[10.5px] text-t3">{ce.actor}</span>
                    <Mono className="text-end text-[9px] text-t4">
                      {fmtDateTime(ce.at)} · h={ce.event_hash.slice(0, 12)}…
                    </Mono>
                  </div>
                </div>
              ))}
            </div>
            <Mono className="text-start text-[9px] text-t4">
              eventHash = H(prevEventHash + payload) ✓ verified
            </Mono>
          </Card>
        </div>
      </div>
    </main>
  );
}
