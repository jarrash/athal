"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Chip, Mono } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ROLE_TONE } from "@/lib/status";

type Provider = {
  provider: string; label: string; model: string; enabled: boolean; locked: boolean; scope: string;
};
type Member = {
  id: string; name: string; email: string; role: string; roleLabel: string;
  department: string | null; status: string; twofa: boolean;
};

const TABS = [
  { key: "profile", label: "الملف الشخصي" },
  { key: "team", label: "الفريق والأدوار" },
  { key: "providers", label: "مزودو الذكاء" },
  { key: "security", label: "الأمان" },
] as const;

export default function SettingsView({
  providers,
  team,
  me,
  isAdmin,
}: {
  providers: Provider[];
  team: Member[];
  me: { name: string; email: string; roleLabel: string; department: string | null; title: string | null; license_no: string | null };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("providers");

  async function toggleProvider(p: Provider) {
    const res = await fetch("/api/settings/ai-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: p.provider, enabled: !p.enabled }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "تعذر التغيير");
      return;
    }
    toast(p.enabled ? `عُطِّل مزود ${p.label}` : `فُعِّل مزود ${p.label}`);
    router.refresh();
  }

  return (
    <main className="fade-up flex flex-col gap-4 px-6 py-[22px]">
      <h2 className="m-0 text-[18px] font-bold text-t1">الإعدادات</h2>

      <div className="flex gap-0.5 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer px-[18px] py-[11px] text-[13px] ${
              tab === t.key
                ? "border-b-2 border-gold font-bold text-t1"
                : "border-b-2 border-transparent font-medium text-t3 hover:text-t1"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <Card className="flex max-w-[560px] flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold text-t1">{me.name}</span>
            <Chip tone="warnDeep">{me.roleLabel}</Chip>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-[12px] text-t2">
            <span>البريد: <Mono className="text-[11px]">{me.email}</Mono></span>
            <span>القسم: {me.department ?? "—"}</span>
            <span>المسمى: {me.title ?? "—"}</span>
            {me.license_no && <span>الرخصة: <Mono className="text-[11px]">{me.license_no}</Mono></span>}
          </div>
        </Card>
      )}

      {tab === "team" && (
        <div className="flex max-w-[860px] flex-col gap-3">
          <Card className="overflow-hidden">
            <div className="gold-toprule grid grid-cols-[1.2fr_1.2fr_130px_110px_90px] items-center gap-3 border-b border-line bg-paper px-[18px] py-2.5 text-[10.5px] font-bold text-t3">
              <span>العضو</span><span>البريد</span><span>الدور</span><span>الحالة</span><span>2FA</span>
            </div>
            {team.map((m) => (
              <div key={m.id} className="grid grid-cols-[1.2fr_1.2fr_130px_110px_90px] items-center gap-3 border-b border-divider bg-white px-[18px] py-3">
                <span className="text-[12.5px] font-medium text-t1">{m.name}</span>
                <Mono className="text-end text-[10.5px] text-t2">{m.email}</Mono>
                <Chip tone={ROLE_TONE[m.role] ?? "neutral"} className="justify-self-start">{m.roleLabel}</Chip>
                <Chip tone={m.status === "active" ? "ok" : "neutral"} className="justify-self-start">
                  {m.status === "active" ? "نشط" : "موقوف"}
                </Chip>
                <span className={`text-[11px] font-semibold ${m.twofa ? "text-ok" : "text-warn"}`}>{m.twofa ? "✓ مفعّلة" : "⚠ معطّلة"}</span>
              </div>
            ))}
          </Card>
          {isAdmin && (
            <Link href="/app/admin/users" className="self-start text-[11.5px] text-t2 underline hover:text-t1">
              إدارة المستخدمين الكاملة (دعوة، إيقاف، أدوار) ←
            </Link>
          )}
        </div>
      )}

      {tab === "providers" && (
        <div className="grid max-w-[980px] grid-cols-2 gap-4">
          {providers.map((p) => (
            <Card key={p.provider} className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2.5">
                {p.locked ? (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] bg-ink text-[14px] text-gold">🇸🇦</span>
                ) : (
                  <Mono className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] border border-chip-border bg-chip text-[10px] font-bold text-t1">
                    {p.label.slice(0, 2).toUpperCase()}
                  </Mono>
                )}
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-bold text-t1">{p.label}</span>
                  <Mono className="text-[9.5px] text-t4">{p.provider} · {p.model}{p.locked ? "" : " · KSA region"}</Mono>
                </div>
                {p.locked ? (
                  <Chip tone="ok" className="ms-auto">مفعّل — افتراضي</Chip>
                ) : (
                  <button
                    onClick={() => toggleProvider(p)}
                    role="switch"
                    aria-checked={p.enabled}
                    className={`relative ms-auto h-5 w-[38px] cursor-pointer rounded-full transition-colors ${p.enabled ? "bg-ink" : "bg-[#c9c4b4]"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                        p.enabled ? "start-[20px] bg-gold" : "start-0.5 bg-white"
                      }`}
                    />
                  </button>
                )}
              </div>
              {p.locked ? (
                <span className="text-[11.5px] leading-[1.9] text-t2">
                  جميع الاستدعاءات تعالَج داخل مراكز بيانات في المملكة. لا يمكن تعطيل هذا المزود.
                </span>
              ) : (
                <>
                  <span className="text-[11.5px] leading-[1.9] text-t2">
                    مزود سيادي اختياري للتحليل التعاقدي العربي — الحالة:{" "}
                    <span className={`font-bold ${p.enabled ? "text-ok" : "text-danger"}`}>{p.enabled ? "مفعّل" : "معطّل"}</span>
                  </span>
                  <span className="text-[10px] text-t4">كل تغيير يُقيَّد فورًا في سجل الإجراءات.</span>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === "security" && (
        <div className="grid max-w-[980px] grid-cols-2 items-start gap-4">
          <Card className="flex flex-col gap-3 p-5">
            <span className="text-[13px] font-bold text-t1">الجلسات والمصادقة</span>
            <div className="flex flex-col gap-2 text-[11.5px] leading-[1.8] text-t2">
              <span>· إغلاق تلقائي للجلسة بعد ١٥ دقيقة من الخمول.</span>
              <span>· قفل الحساب بعد ٥ محاولات دخول فاشلة لمدة ١٥ دقيقة.</span>
              <span className="flex items-center gap-2">
                · مصادقة معززة (OTP) للاعتمادات والتصدير
                <Chip tone="warnDeep">إلزامية — لا يمكن تعطيلها</Chip>
              </span>
            </div>
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <span className="text-[13px] font-bold text-t1">التشفير وسيادة البيانات</span>
            <div className="flex flex-col gap-2 text-[11.5px] leading-[1.8] text-t2">
              <span className="text-ok">✓ تشفير أثناء التخزين AES-256 بمفاتيح مُدارة عبر HSM</span>
              <span className="text-ok">✓ تشفير أثناء النقل TLS 1.3</span>
              <span className="text-ok">✓ سلامة سلسلة بصمات سجل التدقيق — تُفحص تلقائيًا</span>
              <span className="text-ok">✓ إقامة البيانات داخل المملكة 🇸🇦</span>
            </div>
            <span className="text-[10px] text-t4">تقرير الامتثال NCA ECC / PDPL — متاح للممثل النظامي.</span>
          </Card>
        </div>
      )}
    </main>
  );
}
