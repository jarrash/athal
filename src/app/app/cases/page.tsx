import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import { arabicDigits, countdownLabel, daysUntil } from "@/lib/format";
import { Card, Chip, Mono, TableHead } from "@/components/ui";
import { CASE_STAGE_TONE } from "@/lib/status";

export const dynamic = "force-dynamic";

const COLS = "120px 1.4fr 1.1fr 130px 130px";

export default async function CasesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const handle = db();

  const cases = handle
    .prepare(
      "SELECT * FROM cases WHERE tenant_id = ? ORDER BY delivered ASC, court_deadline_at ASC"
    )
    .all(session.tenantId) as {
    id: string; case_number: string; title: string; court: string; stage: string;
    court_deadline_at: string | null; delivered: number;
  }[];

  const active = cases.filter((c) => !c.delivered);
  const within7 = active.filter(
    (c) => c.court_deadline_at && daysUntil(c.court_deadline_at) <= 7 && daysUntil(c.court_deadline_at) >= 0
  );
  const overdue = active.filter((c) => c.court_deadline_at && daysUntil(c.court_deadline_at) < 0);
  const pendingApprovals = (
    handle
      .prepare(
        `SELECT COUNT(*) AS n FROM obligations o JOIN cases c ON c.id = o.case_id
         WHERE c.tenant_id = ? AND o.decision = 'suggested'`
      )
      .get(session.tenantId) as { n: number }
  ).n;

  return (
    <main className="fade-up flex flex-col gap-5 p-6">
      <div className="flex items-center gap-3.5">
        <h1 className="m-0 text-[22px] font-bold text-t1">القضايا</h1>
        <span className="text-[12px] text-t3">
          {arabicDigits(active.length)} قضية نشطة مسندة إليك
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="flex flex-col gap-2 px-[18px] py-4">
          <span className="text-[12px] font-medium text-t3">القضايا النشطة</span>
          <span className="text-[28px] font-bold leading-none text-t1">{arabicDigits(active.length)}</span>
        </Card>
        <div className="flex flex-col gap-2 rounded-[2px] bg-ink px-[18px] py-4 shadow-panel">
          <span className="text-[12px] font-medium text-navtext">مواعيد قضائية خلال ٧ أيام</span>
          <span className="text-[28px] font-bold leading-none text-gold">{arabicDigits(within7.length)}</span>
        </div>
        <Card className="flex flex-col gap-2 px-[18px] py-4">
          <span className="text-[12px] font-medium text-t3">مهام متأخرة</span>
          <span className="text-[28px] font-bold leading-none text-danger">{arabicDigits(overdue.length)}</span>
        </Card>
        <Card className="flex flex-col gap-2 px-[18px] py-4">
          <span className="text-[12px] font-medium text-t3">اعتمادات معلّقة</span>
          <span className="text-[28px] font-bold leading-none text-warn">{arabicDigits(pendingApprovals)}</span>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <TableHead cols={COLS}>
          <span>رقم القضية</span><span>العنوان</span><span>المحكمة</span><span>المرحلة</span><span>الموعد القضائي</span>
        </TableHead>
        {cases.map((c) => {
          const days = c.court_deadline_at ? daysUntil(c.court_deadline_at) : null;
          const urgent = !c.delivered && days !== null && days <= 7;
          return (
            <Link
              key={c.id}
              href={`/app/cases/${c.id}/vault`}
              className={`grid items-center gap-3.5 border-b border-divider border-s-[3px] px-5 py-[13px] hover:bg-fresh-alt ${
                urgent ? "border-s-gold bg-fresh" : "border-s-transparent bg-white"
              }`}
              style={{ gridTemplateColumns: COLS }}
            >
              <Mono className="text-end text-[11.5px] font-semibold text-t1">{c.case_number}</Mono>
              <span className="text-[12.5px] font-medium text-t1">{c.title}</span>
              <span className="text-[12px] text-t2">{c.court}</span>
              <Chip tone={CASE_STAGE_TONE[c.stage] ?? "neutral"} className="justify-self-start">{c.stage}</Chip>
              <span
                className={`justify-self-start rounded-[2px] px-2 py-0.5 text-[11px] ${
                  urgent ? "bg-warn-bg font-bold text-warn-deep" : "font-medium text-t3"
                }`}
              >
                {countdownLabel(c.court_deadline_at, !!c.delivered)}
              </span>
            </Link>
          );
        })}
      </Card>
      <span className="text-[11px] text-t4">انقر أي قضية لفتح مساحة عملها.</span>
    </main>
  );
}
