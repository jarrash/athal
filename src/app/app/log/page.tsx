import { redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import { verifyAuditChain } from "@/lib/audit";
import { fmtDateTime } from "@/lib/format";
import { Card, Chip, Mono, TableHead } from "@/components/ui";
import { LOG_KIND_TONE } from "@/lib/status";

export const dynamic = "force-dynamic";

const COLS = "150px 110px 1.6fr 180px";

/** Read-only, auto-populated, hash-chained action log. */
export default async function LogPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const sql = await db();

  const entries = (await sql`
    SELECT * FROM audit_log WHERE tenant_id = ${session.tenantId} ORDER BY id DESC LIMIT 200`) as {
    id: number; kind: string; text: string; actor: string; at: string;
  }[];

  const chainOk = await verifyAuditChain(sql, session.tenantId);
  const freshCutoff = Date.now() - 15 * 60_000;

  return (
    <main className="fade-up flex flex-col gap-3.5 px-6 py-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-[18px] font-bold text-t1">سجل الإجراءات</h2>
        <Chip tone="neutral">للقراءة فقط — قيد تلقائي</Chip>
        <span className="text-[11px] text-t4">قراراتك في هذه الجلسة تظهر هنا فورًا</span>
        <div className="flex-1" />
        <Chip tone={chainOk ? "ok" : "danger"}>
          {chainOk ? "✓ سلسلة البصمات سليمة" : "⚠ خلل في سلسلة البصمات"}
          <Mono className="text-[8.5px]">eventHash = H(prev + payload)</Mono>
        </Chip>
      </div>

      <Card className="overflow-hidden">
        <TableHead cols={COLS}>
          <span>الوقت</span><span>النوع</span><span>الإجراء</span><span>المنفِّذ</span>
        </TableHead>
        {entries.map((l) => (
          <div
            key={l.id}
            className={`grid items-center gap-3 border-b border-divider px-[18px] py-3 ${
              new Date(l.at).getTime() > freshCutoff ? "bg-fresh" : "bg-white"
            }`}
            style={{ gridTemplateColumns: COLS }}
          >
            <Mono className="text-end text-[9.5px] text-t2">{fmtDateTime(l.at)}</Mono>
            <Chip tone={LOG_KIND_TONE[l.kind] ?? "neutral"} className="justify-self-start">{l.kind}</Chip>
            <span className="text-[12px] text-body">{l.text}</span>
            <span className="text-[11px] text-t2">{l.actor}</span>
          </div>
        ))}
      </Card>
    </main>
  );
}
