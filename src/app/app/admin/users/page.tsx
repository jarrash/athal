import { redirect } from "next/navigation";
import { db } from "@/db";
import { getSession } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/status";
import UsersView from "./UsersView";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "systemic_rep") redirect("/app/settings");
  const sql = await db();

  const [tenant] = (await sql`
    SELECT name FROM tenants WHERE id = ${session.tenantId}`) as { name: string }[];

  const users = (await sql`
    SELECT * FROM users WHERE tenant_id = ${session.tenantId} ORDER BY created_at`) as {
    id: string; name: string; email: string; role: string; department: string | null;
    status: string; twofa_enabled: number; last_login_at: string | null;
  }[];

  const invitations = (await sql`
    SELECT * FROM invitations WHERE tenant_id = ${session.tenantId} ORDER BY created_at DESC`) as {
    id: string; name: string; email: string; role: string; status: string; expires_at: string;
  }[];

  return (
    <UsersView
      tenantName={tenant.name}
      meId={session.userId}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        roleLabel: ROLE_LABEL[u.role] ?? u.role,
        department: u.department,
        status: u.status,
        twofa: !!u.twofa_enabled,
        lastLoginAt: u.last_login_at,
      }))}
      invitations={invitations.map((i) => ({
        ...i,
        roleLabel: ROLE_LABEL[i.role] ?? i.role,
        expired: new Date(i.expires_at).getTime() < Date.now(),
      }))}
    />
  );
}
