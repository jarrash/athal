import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import { fmtDateTime, gregorianLong, hijriDate } from "@/lib/format";
import { Mono } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Print-friendly report view: numbered conclusions with citation appendix and
 * the expert's action-log appendix ("سجل أعمال الخبير") — print to PDF from
 * the browser. A server-generated PDF/DOCX pipeline replaces this later.
 */
export default async function ReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const sql = await db();

  const [kase] = (await sql`
    SELECT * FROM cases WHERE id = ${id} AND tenant_id = ${session.tenantId}`) as
    { id: string; case_number: string; title: string; court: string }[];
  if (!kase) notFound();

  const conclusions = (await sql`
    SELECT * FROM conclusions WHERE case_id = ${kase.id} ORDER BY number ASC`) as {
    number: string; section_label: string; section_title: string; text: string;
    status: string; citations: string; approved_by: string | null;
  }[];

  const evidence = (await sql`
    SELECT ref, title, filename, sha256, uploaded_at FROM evidence
    WHERE case_id = ${kase.id} AND status != 'quarantined' ORDER BY ref`) as
    { ref: string; title: string; filename: string; sha256: string; uploaded_at: string }[];

  const log = (await sql`
    SELECT kind, text, actor, at FROM audit_log WHERE case_id = ${kase.id} ORDER BY id ASC`) as
    { kind: string; text: string; actor: string; at: string }[];

  const citedRefs = new Set(conclusions.flatMap((c) => JSON.parse(c.citations) as string[]));

  return (
    <main className="mx-auto flex max-w-[820px] flex-col gap-8 bg-white px-12 py-14 text-body print:px-0 print:py-0">
      <header className="flex flex-col gap-2 border-b-2 border-ink pb-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex rounded-[2px] bg-gold px-3 py-1.5 text-[18px] font-bold leading-none text-ink">أثالــــ</span>
          <Mono className="text-[11px] text-t3">{kase.case_number}</Mono>
        </div>
        <h1 className="m-0 text-[22px] font-bold text-t1">التقرير الابتدائي — {kase.title}</h1>
        <span className="text-[12px] text-t2">{kase.court}</span>
        <span className="text-[11px] text-t3">
          {gregorianLong()} · {hijriDate()} · الخبير: {session.name}
          {session.licenseNo && <> · رخصة <Mono>{session.licenseNo}</Mono></>}
        </span>
      </header>

      {conclusions.map((c) => (
        <section key={c.number} className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-bold text-t1">
            استنتاج <Mono>{c.number}</Mono> — {c.section_title}
          </h2>
          <p className="m-0 text-[13.5px] leading-loose">{c.text.replace(/\{([^}]+)\}/g, "[$1]")}</p>
          <span className="text-[10.5px] text-t3">
            الاستشهادات: {(JSON.parse(c.citations) as string[]).join("، ") || "—"}
            {c.approved_by && ` · اعتمده ${c.approved_by}`}
          </span>
        </section>
      ))}

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="m-0 text-[15px] font-bold text-t1">الملحق أ — قائمة الأدلة المستشهد بها</h2>
        {evidence
          .filter((e) => citedRefs.has(e.ref))
          .map((e) => (
            <div key={e.ref} className="flex flex-col gap-0.5 text-[11.5px]">
              <span>
                <Mono className="font-semibold">{e.ref}</Mono> — {e.title} (<Mono className="text-[10px]">{e.filename}</Mono>)
              </span>
              <Mono className="text-[9px] text-t3">SHA-256: {e.sha256}</Mono>
            </div>
          ))}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="m-0 text-[15px] font-bold text-t1">الملحق ب — سجل أعمال الخبير</h2>
        {log.map((l, i) => (
          <div key={i} className="flex gap-3 text-[11px]">
            <Mono className="w-[150px] flex-none text-[9.5px] text-t3">{fmtDateTime(l.at)}</Mono>
            <span className="w-[90px] flex-none font-semibold text-t2">{l.kind}</span>
            <span className="flex-1">{l.text}</span>
          </div>
        ))}
      </section>

      <footer className="border-t border-line pt-4 text-[9.5px] text-t4">
        وثيقة مولّدة من منصة أثال — كل استنتاج مسند إلى أدلة مرقّمة ببصمات SHA-256، وسجل الأعمال مسلسل ببصمات متسلسلة (hash chain) غير قابلة للتعديل.
      </footer>
    </main>
  );
}
