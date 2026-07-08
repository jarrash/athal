import { redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import SettingsView from "./SettingsView";
import { ROLE_LABEL } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const sql = await db();

  const providers = (await sql`
    SELECT * FROM ai_providers WHERE tenant_id = ${session.tenantId} ORDER BY locked DESC`) as {
    provider: string; label: string; model: string; enabled: number; locked: number; scope: string;
  }[];

  const team = (await sql`
    SELECT id, name, email, role, department, status, twofa_enabled
    FROM users WHERE tenant_id = ${session.tenantId} ORDER BY created_at`) as {
    id: string; name: string; email: string; role: string; department: string | null;
    status: string; twofa_enabled: number;
  }[];

  const [me] = (await sql`
    SELECT name, email, role, department, title, license_no FROM users WHERE id = ${session.userId}`) as {
    name: string; email: string; role: string; department: string | null;
    title: string | null; license_no: string | null;
  }[];

  return (
    <SettingsView
      providers={providers.map((p) => ({ ...p, enabled: !!p.enabled, locked: !!p.locked }))}
      team={team.map((t) => ({ ...t, roleLabel: ROLE_LABEL[t.role] ?? t.role, twofa: !!t.twofa_enabled }))}
      me={{ ...me, roleLabel: ROLE_LABEL[me.role] ?? me.role }}
      isAdmin={session.role === "systemic_rep"}
    />
  );
}
