import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { countdownLabel, gregorianLong, hijriDate } from "@/lib/format";
import Sidebar from "@/components/Sidebar";
import Topbar, { type CaseMini } from "@/components/Topbar";
import { ToastProvider } from "@/components/Toast";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const handle = db();

  const casesCount = (
    handle
      .prepare("SELECT COUNT(*) AS n FROM cases WHERE tenant_id = ? AND delivered = 0")
      .get(session.tenantId) as { n: number }
  ).n;

  const cases = handle
    .prepare(
      "SELECT id, case_number, title, court_deadline_at, delivered FROM cases WHERE tenant_id = ?"
    )
    .all(session.tenantId) as {
    id: string; case_number: string; title: string; court_deadline_at: string | null; delivered: number;
  }[];

  const evidenceCounts = handle
    .prepare("SELECT case_id, COUNT(*) AS n FROM evidence WHERE tenant_id = ? GROUP BY case_id")
    .all(session.tenantId) as { case_id: string; n: number }[];
  const totalEvidence = evidenceCounts.reduce((a, r) => a + r.n, 0);

  const providers = handle
    .prepare("SELECT provider, model, enabled FROM ai_providers WHERE tenant_id = ? ORDER BY locked DESC")
    .all(session.tenantId) as { provider: string; model: string; enabled: number }[];
  const enabled = providers.filter((p) => p.enabled);
  const providerLine =
    enabled.length > 1
      ? enabled.map((p) => (p.provider === "sovereign-ksa" ? p.provider : `${p.provider}·${p.model}`)).join(" + ")
      : `${enabled[0]?.provider ?? "sovereign-ksa"} · model ${enabled[0]?.model ?? ""}`;

  const casesMini: CaseMini[] = cases.map((c) => ({
    id: c.id,
    number: c.case_number,
    title: c.title,
    deadlineLabel: c.delivered ? null : c.court_deadline_at ? countdownLabel(c.court_deadline_at) : null,
  }));

  const user = handle
    .prepare("SELECT name, title, license_no FROM users WHERE id = ?")
    .get(session.userId) as { name: string; title: string; license_no: string | null };

  return (
    <ToastProvider>
      <div className="flex min-h-screen items-stretch">
        <Sidebar casesCount={casesCount} evidenceCount={totalEvidence} providerLine={providerLine} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={{ name: user.name, title: user.title, licenseNo: user.license_no }}
            cases={casesMini}
            dateLine={`${gregorianLong()} · ${hijriDate()}`}
          />
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
