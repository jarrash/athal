"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Chip, Mono, TableHead } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/status";
import { fmtDateTime } from "@/lib/format";

type UserRow = {
  id: string; name: string; email: string; role: string; roleLabel: string;
  department: string | null; status: string; twofa: boolean; lastLoginAt: string | null;
};
type InviteRow = {
  id: string; name: string; email: string; role: string; roleLabel: string;
  status: string; expires_at: string; expired: boolean;
};

const COLS = "1.2fr 1.3fr 130px 110px 100px 70px 130px 110px";

export default function UsersView({
  tenantName,
  meId,
  users,
  invitations,
}: {
  tenantName: string;
  meId: string;
  users: UserRow[];
  invitations: InviteRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"users" | "invites">("users");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "standard_user", department: "", consultantExpiresAt: "" });
  const [busy, setBusy] = useState(false);

  async function setStatus(u: UserRow, action: "suspend" | "reactivate") {
    const res = await fetch(`/api/admin/users/${u.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "تعذر التنفيذ");
      return;
    }
    toast(action === "suspend" ? `أُوقف وصول ${u.name}` : `أُعيد تفعيل ${u.name} بدوره السابق`);
    router.refresh();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(data.error ?? "تعذر إرسال الدعوة");
      return;
    }
    toast("أُرسلت الدعوة — تنتهي صلاحيتها خلال ٧٢ ساعة");
    setDrawerOpen(false);
    setForm({ name: "", email: "", role: "standard_user", department: "", consultantExpiresAt: "" });
    setTab("invites");
    router.refresh();
  }

  const input = "w-full rounded-[2px] border border-line bg-white px-3 py-2 text-[12px] text-t1 outline-none focus:border-gold";

  return (
    <main className="fade-up flex flex-col gap-4 px-6 py-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-[18px] font-bold text-t1">إدارة المستخدمين</h2>
        <Chip tone="neutral">{tenantName}</Chip>
        <div className="flex-1" />
        <button
          onClick={() => setDrawerOpen(true)}
          className="cursor-pointer rounded-[2px] bg-ink px-4 py-2 text-[12px] font-bold text-paper shadow-btn hover:bg-ink-hover"
        >
          + دعوة عضو
        </button>
      </div>

      <div className="flex gap-0.5 border-b border-line">
        {(
          [
            { key: "users", label: `المستخدمون (${users.length})` },
            { key: "invites", label: `الدعوات المعلّقة (${invitations.filter((i) => i.status === "pending" && !i.expired).length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer px-[18px] py-[11px] text-[13px] ${
              tab === t.key ? "border-b-2 border-gold font-bold text-t1" : "border-b-2 border-transparent font-medium text-t3 hover:text-t1"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <Card className="overflow-hidden">
          <TableHead cols={COLS}>
            <span>العضو</span><span>البريد</span><span>الدور</span><span>القسم</span><span>الحالة</span><span>2FA</span><span>آخر دخول</span><span>إجراء</span>
          </TableHead>
          {users.map((u) => (
            <div key={u.id} className="grid items-center gap-3 border-b border-divider bg-white px-[18px] py-3" style={{ gridTemplateColumns: COLS }}>
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[2px] bg-ink text-[9px] font-bold text-gold">
                  {u.name.replace(/^(م|د|أ)\.\s*/, "").slice(0, 2)}
                </span>
                <span className="text-[12.5px] font-medium text-t1">{u.name}{u.id === meId && <span className="ms-1 text-[9.5px] text-t4">(أنت)</span>}</span>
              </span>
              <Mono className="overflow-hidden text-ellipsis text-end text-[10.5px] text-t2">{u.email}</Mono>
              <Chip tone={ROLE_TONE[u.role] ?? "neutral"} className="justify-self-start">{u.roleLabel}</Chip>
              <span className="text-[11px] text-t2">{u.department ?? "—"}</span>
              <Chip tone={u.status === "active" ? "ok" : "neutral"} className="justify-self-start">
                {u.status === "active" ? "نشط" : "موقوف"}
              </Chip>
              <span className={`text-[11px] font-semibold ${u.twofa ? "text-ok" : "text-warn"}`}>{u.twofa ? "✓" : "⚠"}</span>
              <Mono className="text-end text-[9.5px] text-t3">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "—"}</Mono>
              {u.status === "active" ? (
                <button
                  onClick={() => setStatus(u, "suspend")}
                  className="cursor-pointer justify-self-start rounded-[2px] border border-danger-border bg-white px-2.5 py-1 text-[10px] font-semibold text-danger hover:bg-danger-bg"
                >
                  إيقاف الوصول
                </button>
              ) : (
                <button
                  onClick={() => setStatus(u, "reactivate")}
                  className="cursor-pointer justify-self-start rounded-[2px] border border-ok-border bg-white px-2.5 py-1 text-[10px] font-semibold text-ok hover:bg-ok-bg"
                >
                  إعادة تفعيل
                </button>
              )}
            </div>
          ))}
          <div className="bg-paper px-[18px] py-2.5">
            <span className="text-[10.5px] text-t3">
              لا يمكن إيقاف الممثل النظامي النشط الوحيد — يفرض الخادم بقاء ممثل نظامي واحد على الأقل.
            </span>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TableHead cols="1.2fr 1.3fr 150px 130px 150px">
            <span>الاسم</span><span>البريد</span><span>الدور</span><span>الحالة</span><span>تنتهي</span>
          </TableHead>
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 border border-dashed border-line px-6 py-10">
              <span className="text-[12px] text-t3">لا توجد دعوات معلّقة.</span>
            </div>
          ) : (
            invitations.map((i) => (
              <div key={i.id} className="grid grid-cols-[1.2fr_1.3fr_150px_130px_150px] items-center gap-3 border-b border-divider bg-white px-[18px] py-3">
                <span className="text-[12.5px] font-medium text-t1">{i.name}</span>
                <Mono className="text-end text-[10.5px] text-t2">{i.email}</Mono>
                <Chip tone={ROLE_TONE[i.role] ?? "neutral"} className="justify-self-start">{i.roleLabel}</Chip>
                <Chip tone={i.expired ? "neutral" : "warn"} className="justify-self-start">
                  {i.expired ? "منتهية — أرسل دعوة جديدة" : "معلّقة"}
                </Chip>
                <Mono className="text-end text-[9.5px] text-t3">{fmtDateTime(i.expires_at)}</Mono>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Invite drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-start bg-[rgba(19,44,44,.45)]" onClick={() => setDrawerOpen(false)}>
          <form
            onSubmit={invite}
            onClick={(e) => e.stopPropagation()}
            className="fade-up flex h-full w-[380px] flex-col gap-4 overflow-y-auto border-e border-line bg-paper p-6 shadow-modal"
          >
            <div className="flex items-center">
              <span className="text-[15px] font-bold text-t1">دعوة عضو جديد</span>
              <button type="button" onClick={() => setDrawerOpen(false)} className="ms-auto cursor-pointer text-[14px] text-t4">✕</button>
            </div>
            <label className="flex flex-col gap-1.5 text-[11px] font-bold text-t2">
              الاسم الكامل
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-bold text-t2">
              البريد الإلكتروني
              <input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${input} mono-ltr`} />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-bold text-t2">
              الدور
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={input}>
                {Object.entries(ROLE_LABEL)
                  .filter(([r]) => r !== "platform_support")
                  .map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-bold text-t2">
              القسم
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={input} />
            </label>
            {form.role === "external_consultant" && (
              <label className="flex flex-col gap-1.5 rounded-[2px] border border-warn-border bg-warn-bg p-3 text-[11px] font-bold text-warn-deep">
                تاريخ انتهاء الوصول — إلزامي للاستشاري الخارجي
                <input
                  required
                  type="date"
                  dir="ltr"
                  value={form.consultantExpiresAt}
                  onChange={(e) => setForm({ ...form, consultantExpiresAt: e.target.value })}
                  className={input}
                />
              </label>
            )}
            <div className="flex items-center gap-2 rounded-[2px] border border-line bg-white px-3 py-2.5">
              <input type="checkbox" checked readOnly className="h-4 w-4 accent-[#132C2C]" />
              <span className="text-[11px] text-t2">تفعيل المصادقة الثنائية إلزامي عند أول تسجيل دخول</span>
            </div>
            <span className="text-[10px] text-t4">تنتهي صلاحية رابط الدعوة بعد ٧٢ ساعة، ولا يمكن إعادة تفعيله — تُرسل دعوة جديدة بدلًا منه.</span>
            <button disabled={busy} className="cursor-pointer rounded-[2px] bg-ink px-4 py-2.5 text-[12.5px] font-bold text-paper shadow-btn hover:bg-ink-hover disabled:opacity-60">
              إرسال الدعوة
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
