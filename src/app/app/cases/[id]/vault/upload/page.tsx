import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import UploadView from "./UploadView";

export const dynamic = "force-dynamic";

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const sql = await db();

  const [kase] = (await sql`
    SELECT id FROM cases WHERE id = ${id} AND tenant_id = ${session.tenantId}`) as { id: string }[];
  if (!kase) notFound();

  const parties = (await sql`
    SELECT name, role FROM parties WHERE case_id = ${kase.id}`) as { name: string; role: string }[];
  const partyOptions = [
    ...parties.map((p) => p.role),
    "مشترك",
    "معاينة الخبير",
  ].filter((v, i, a) => a.indexOf(v) === i);

  return <UploadView caseId={kase.id} partyOptions={partyOptions} />;
}
