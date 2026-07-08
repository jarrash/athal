import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import UploadView from "./UploadView";

export const dynamic = "force-dynamic";

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const handle = db();

  const kase = handle
    .prepare("SELECT id FROM cases WHERE id = ? AND tenant_id = ?")
    .get(id, session.tenantId) as { id: string } | undefined;
  if (!kase) notFound();

  const parties = handle
    .prepare("SELECT name, role FROM parties WHERE case_id = ?")
    .all(kase.id) as { name: string; role: string }[];
  const partyOptions = [
    ...parties.map((p) => p.role),
    "مشترك",
    "معاينة الخبير",
  ].filter((v, i, a) => a.indexOf(v) === i);

  return <UploadView caseId={kase.id} partyOptions={partyOptions} />;
}
