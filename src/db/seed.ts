import type { Database } from "better-sqlite3";
import { chainHash, hashPassword } from "@/lib/crypto";

/**
 * Demo seed — the fictional sample case from the design handoff
 * (4723/ق/1447، "شركة البنيان للتطوير" ضد "مؤسسة الرصين للمقاولات").
 * Structure is real; data is illustrative.
 */

const DEMO_PASSWORD = "Athal!Demo1447";

function iso(daysFromNow: number, time = "09:00:00"): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${time}`;
}

export function seedIfEmpty(handle: Database) {
  const hasUsers = handle.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (hasUsers.n > 0) return;

  const now = new Date().toISOString();
  const TENANT = "tn-otaibi";
  const pw = hashPassword(DEMO_PASSWORD);

  handle
    .prepare("INSERT INTO tenants (id, name, created_at) VALUES (?,?,?)")
    .run(TENANT, "مكتب العتيبي للخبرة القضائية", now);

  const insUser = handle.prepare(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role, department, title, status, twofa_enabled, license_no, consultant_expires_at, last_login_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  insUser.run("u-khalid", TENANT, "م. خالد العتيبي", "khalid@athal.sa", pw, "systemic_rep", "الهندسة", "خبير منتدب", "active", 1, "8841", null, iso(0, "08:12:44"), iso(-190));
  insUser.run("u-sara", TENANT, "أ. سارة القحطاني", "sara@athal.sa", pw, "standard_user", "أمانة السر", "أمينة السر", "active", 1, null, null, iso(-1, "16:40:02"), iso(-180));
  insUser.run("u-fahad", TENANT, "د. فهد الدوسري", "fahad@athal.sa", pw, "dept_manager", "المحاسبة", "خبير محاسبي", "active", 1, "7212", null, iso(-2, "11:05:31"), iso(-170));
  insUser.run("u-noura", TENANT, "نورة الشمري", "noura@athal.sa", pw, "read_only", "المراجعة الداخلية", "مراجعة جودة", "active", 0, null, null, iso(-6, "09:22:10"), iso(-90));
  insUser.run("u-amr", TENANT, "م. عمرو الحربي", "amr@consult.example.sa", pw, "external_consultant", "استشاري خارجي", "استشاري إنشائي", "active", 1, null, iso(30), iso(-3, "13:11:47"), iso(-20));

  handle
    .prepare(
      `INSERT INTO invitations (id, tenant_id, name, email, role, department, status, expires_at, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run("inv-1", TENANT, "محمد العنزي", "m.alanazi@athal.sa", "standard_user", "الهندسة", "pending", iso(3), "u-khalid", iso(0, "08:30:00"));

  const insCase = handle.prepare(
    `INSERT INTO cases (id, tenant_id, case_number, title, court, stage, assigned_expert_id, court_deadline_at, delivered, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  insCase.run("case-4723", TENANT, "4723/ق/1447", "نزاع مقاولات — البنيان ضد الرصين", "التجارية بالرياض — د٤", "تحليل", "u-khalid", iso(2), 0, iso(-40));
  insCase.run("case-3390", TENANT, "3390/ق/1447", "مطالبة مستخلصات — الأفق ضد سلمان", "الاستئناف بجدة — د٢", "تقرير", "u-khalid", iso(4), 0, iso(-70));
  insCase.run("case-4102", TENANT, "4102/ق/1447", "تعثر نظام ERP — التقنية المتقدمة", "العامة بالدمام — د١", "أسئلة الأطراف", "u-khalid", iso(10), 0, iso(-55));
  insCase.run("case-3877", TENANT, "3877/ق/1447", "عيوب إنشائية — برج النخيل", "التجارية بالرياض — د٧", "تحليل", "u-khalid", iso(16), 0, iso(-30));
  insCase.run("case-2954", TENANT, "2954/ق/1446", "تصفية شركة — الوفاق التجارية", "التجارية بجدة — د٥", "استلام", "u-fahad", iso(22), 0, iso(-120));
  insCase.run("case-2311", TENANT, "2311/ق/1446", "تقدير أضرار حريق — مستودعات الشرق", "العامة بالرياض — د٣", "مُسلَّم", "u-khalid", null, 1, iso(-200));

  const insParty = handle.prepare(
    `INSERT INTO parties (id, case_id, name, role, note, confidence, approved) VALUES (?,?,?,?,?,?,?)`
  );
  insParty.run("p-1", "case-4723", "شركة البنيان للتطوير", "مدعي", "مالك المشروع — طرف العقد الأول. مثّلها مكتب الجريّد للمحاماة.", 96, 1);
  insParty.run("p-2", "case-4723", "مؤسسة الرصين للمقاولات", "مدعى عليه", "المقاول الرئيس — تجاوز مدة التنفيذ محل النزاع.", 96, 1);
  insParty.run("p-3", "case-4723", "مكتب الأبعاد الاستشاري", "مقاول باطن", "استشاري الإشراف — مصدر اعتماد المستخلصات في المحاضر.", 81, 1);

  const insEv = handle.prepare(
    `INSERT INTO evidence (id, tenant_id, case_id, ref, title, filename, size, sha256, status, scan_status, party_label, uploaded_by, uploaded_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insCustody = handle.prepare(
    `INSERT INTO custody_events (evidence_id, action, actor, at, prev_hash, event_hash) VALUES (?,?,?,?,?,?)`
  );
  const custodyChain = (evidenceId: string, events: { action: string; actor: string; at: string }[]) => {
    let prev: string | null = null;
    for (const e of events) {
      const h = chainHash(prev, { evidenceId, ...e });
      insCustody.run(evidenceId, e.action, e.actor, e.at, prev, h);
      prev = h;
    }
  };

  insEv.run("ev-014", TENANT, "case-4723", "دليل-014", "عقد المقاولة الأصلي", "contract_phase2_signed.pdf", 4_183_204, "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069", "documented", "clean", "المدعي", "أ. سارة القحطاني — أمينة السر", iso(-8, "14:32:07"));
  custodyChain("ev-014", [
    { action: "إيداع أصلي + بصمة رقمية", actor: "أ. سارة القحطاني — أمينة السر", at: iso(-8, "14:32:07") },
    { action: "تحقق الخادم من البصمة", actor: "النظام — تحقق مزدوج", at: iso(-8, "14:32:11") },
    { action: "اطّلاع للمعاينة", actor: "م. خالد العتيبي", at: iso(-7, "09:14:51") },
    { action: "تحليل آلي — استخراج الالتزامات", actor: "المساعد الذكي (سيادي)", at: iso(-5, "11:02:33") },
  ]);

  insEv.run("ev-015", TENANT, "case-4723", "دليل-015", "المستخلصات المالية 1–8", "payment_certificates_1-8.xlsx", 1_204_776, "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae", "documented", "clean", "المدعى عليه", "مكتب وكيل المدعى عليه", iso(-8, "16:05:20"));
  custodyChain("ev-015", [
    { action: "إيداع أصلي + بصمة رقمية", actor: "مكتب وكيل المدعى عليه", at: iso(-8, "16:05:20") },
    { action: "تحقق الخادم من البصمة", actor: "النظام — تحقق مزدوج", at: iso(-8, "16:05:24") },
  ]);

  insEv.run("ev-012", TENANT, "case-4723", "بريد-012", "مراسلة إخطار التأخير", "delay_notice_2025-11-03.eml", 88_412, "9b74c9897bac770ffc029102a200c5de1e58f46d1f34c8e8a8d51e1b0f4e2a7c", "disputed", "clean", "المدعي", "مكتب وكيل المدعي", iso(-7, "10:47:15"));
  custodyChain("ev-012", [
    { action: "إيداع أصلي + بصمة رقمية", actor: "مكتب وكيل المدعي", at: iso(-7, "10:47:15") },
    { action: "اعتراض على النسبة", actor: "وكيل المدعى عليه", at: iso(-6, "12:03:40") },
    { action: "إحالة للتحقق الفني", actor: "م. خالد العتيبي", at: iso(-6, "12:35:08") },
  ]);

  insEv.run("ev-021", TENANT, "case-4723", "دليل-021", "محاضر الاجتماعات 4–9", "meeting_minutes_4-9.pdf", 2_366_090, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "documented", "clean", "مشترك", "أ. سارة القحطاني", iso(-7, "11:22:41"));
  custodyChain("ev-021", [
    { action: "إيداع أصلي + بصمة رقمية", actor: "أ. سارة القحطاني", at: iso(-7, "11:22:41") },
    { action: "اطّلاع للمعاينة", actor: "م. خالد العتيبي", at: iso(-6, "08:55:19") },
  ]);

  insEv.run("ev-009", TENANT, "case-4723", "دليل-009", "صور المعاينة الميدانية", "site_inspection_batch3.zip", 148_366_222, "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e", "documented", "clean", "معاينة الخبير", "م. خالد العتيبي", iso(-6, "12:20:33"));
  custodyChain("ev-009", [
    { action: "إيداع أصلي + بصمة رقمية", actor: "م. خالد العتيبي — معاينة موثقة", at: iso(-6, "12:20:33") },
  ]);

  insEv.run("ev-027", TENANT, "case-4723", "دليل-027", "جدول الكميات BOQ", "boq_approved_rev2.xlsx", 3_412_950, "4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5", "analyzing", "clean", "المدعى عليه", "مكتب وكيل المدعى عليه", iso(-5, "09:12:58"));
  custodyChain("ev-027", [
    { action: "إيداع أصلي + بصمة رقمية", actor: "مكتب وكيل المدعى عليه", at: iso(-5, "09:12:58") },
    { action: "قيد المعالجة الآلية OCR", actor: "المساعد الذكي (سيادي)", at: iso(-5, "09:13:20") },
  ]);

  const insOb = handle.prepare(
    `INSERT INTO obligations (id, case_id, clause, responsible, status, evidence_refs, confidence, decision, decided_by, decided_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  insOb.run("ob-1", "case-4723", "تسليم أعمال المرحلة الثانية في موعد أقصاه 15/06/1447هـ (م14)", "المدعى عليه", "غير منفذ", JSON.stringify(["دليل-014", "بريد-012"]), 92, "suggested", null, null);
  insOb.run("ob-2", "case-4723", "سداد المستخلصات خلال ٣٠ يومًا من اعتمادها (م9)", "المدعي", "منفذ", JSON.stringify(["دليل-015"]), 88, "suggested", null, null);
  insOb.run("ob-3", "case-4723", "توفير المخططات التنفيذية قبل بدء الأعمال (م6)", "المدعي", "منفذ", JSON.stringify(["دليل-021"]), 84, "suggested", null, null);
  insOb.run("ob-4", "case-4723", "غرامة تأخير ٠٫٥٪ أسبوعيًا بحد أقصى ١٠٪ (م22)", "المدعى عليه", "متنازع", JSON.stringify(["دليل-014"]), 79, "suggested", null, null);
  insOb.run("ob-5", "case-4723", "التأمين على الأعمال طوال مدة التنفيذ (م17)", "المدعى عليه", "غير مثبت", "[]", 58, "suggested", null, null);

  const insConc = handle.prepare(
    `INSERT INTO conclusions (id, case_id, number, section_label, section_title, text, status, citations, trace_considered, trace_excluded, trace_rationale, approved_by, approved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  insConc.run(
    "c-41", "case-4723", "4.1", "القسم الرابع", "النتائج الفنية — مدة التنفيذ",
    "يثبت للخبير أن المدعى عليه تجاوز مدة التنفيذ التعاقدية المحددة في المادة الرابعة عشرة {دليل-014} بواقع أربعة وتسعين يومًا، وفق مراسلة إخطار التأخير {بريد-012}.",
    "approved", JSON.stringify(["دليل-014", "بريد-012"]),
    "عقد المقاولة (م14، م22) · إخطار التأخير · محاضر الاجتماعات 4–9",
    "القوة القاهرة — لا إخطار نظامي · تأخر المخططات — نُفي بمحضر الاجتماع السادس",
    "تطابق نصي مباشر بين الالتزام التعاقدي وواقعة التأخير من مصدرين مستقلين.",
    "م. خالد العتيبي", iso(0, "09:41:12")
  );
  insConc.run(
    "c-42", "case-4723", "4.2", "القسم الرابع", "النتائج الفنية — مدة التنفيذ",
    "كما يتبين للخبير وجود قصور في أعمال التشطيبات للدور الثاني يقدر أثره المالي بمبلغ ٤٢٠,٠٠٠ ريال.",
    "pending", "[]", null, null, null, null, null
  );

  // Base audit entries (hash-chained)
  const insLog = handle.prepare(
    `INSERT INTO audit_log (tenant_id, case_id, kind, text, actor, ip, at, prev_hash, event_hash) VALUES (?,?,?,?,?,?,?,?,?)`
  );
  let prev: string | null = null;
  const logEvents: [string | null, string, string, string, string][] = [
    ["case-4723", "إعدادات", "تفعيل مزود HUMAIN — نطاق مساحة العمل", "م. خالد العتيبي — الخبير", iso(-7, "08:12:44")],
    ["case-4723", "معاينة", "معاينة ميدانية ثانية — الدور الثاني بحضور الطرفين", "م. خالد العتيبي — الخبير", iso(-6, "12:20:33")],
    ["case-4723", "اعتماد ذكاء", "اعتماد استنتاج 4.1 — تجاوز مدة التنفيذ (ثقة 92%)", "م. خالد العتيبي — الخبير", iso(0, "09:41:12")],
  ];
  for (const [caseId, kind, text, actor, at] of logEvents) {
    const h = chainHash(prev, { caseId, kind, text, actor, at });
    insLog.run(TENANT, caseId, kind, text, actor, "10.20.4.11", at, prev, h);
    prev = h;
  }

  const insProv = handle.prepare(
    `INSERT INTO ai_providers (tenant_id, provider, label, model, enabled, locked, scope) VALUES (?,?,?,?,?,?,?)`
  );
  insProv.run(TENANT, "sovereign-ksa", "المزود السيادي الافتراضي", "athal-1.4", 1, 1, "workspace");
  insProv.run(TENANT, "humain", "HUMAIN", "allam-2", 1, 0, "workspace");
}
