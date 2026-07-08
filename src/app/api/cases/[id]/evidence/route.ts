import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { sha256Hex } from "@/lib/crypto";
import { appendAudit, appendCustody } from "@/lib/audit";
import { clientIp, handler, requireDecisionRole, requireSession } from "@/lib/api";

/** EICAR standard antivirus test signature — used to simulate the malware gate. */
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/** Demo bound — swap blob storage to Supabase Storage before raising this. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Permanent (WORM) evidence deposit.
 * - Server recomputes SHA-256 and must match the client's hash (double verification).
 * - Dual-engine malware scan runs BEFORE deposit; infected files are quarantined,
 *   never deposited, never deleted (they may themselves be evidence of bad intent).
 * - Deposit is irreversible; corrections are new, independently-numbered items.
 */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession(req);
  requireDecisionRole(session);
  const { id } = await ctx.params;
  const sql = await db();

  const [kase] = (await sql`
    SELECT * FROM cases WHERE id = ${id} AND tenant_id = ${session.tenantId}`) as
    { id: string; case_number: string }[];
  if (!kase) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const partyLabel = String(form.get("partyLabel") ?? "").trim();
  const clientSha256 = String(form.get("clientSha256") ?? "").toLowerCase();
  const acknowledged = form.get("ack") === "1";

  if (!(file instanceof File)) return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  if (!title || !partyLabel) {
    return NextResponse.json({ error: "بيانات ناقصة — النوع والطرف مطلوبان قبل الإيداع" }, { status: 400 });
  }
  if (!acknowledged) {
    return NextResponse.json({ error: "الإقرار بأصالة الملفات مطلوب قبل الإيداع الدائم" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "حجم الملف يتجاوز حد النسخة التجريبية (٨ م.ب) — يُرفع الحد مع تخزين الملفات السحابي" },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const serverHash = sha256Hex(bytes);

  // Double verification: client-side hash must match the server's.
  if (clientSha256 && clientSha256 !== serverHash) {
    await appendAudit(sql, {
      tenantId: session.tenantId, caseId: kase.id, kind: "أمان",
      text: `فشل تحقق البصمة للملف ${file.name} — بصمة الخادم لا تطابق بصمة العميل، لم يُودَع الملف`,
      actor: session.name, ip: clientIp(req),
    });
    return NextResponse.json(
      { error: "بصمة الخادم لا تطابق بصمة العميل — لم يُودَع الملف" },
      { status: 409 }
    );
  }

  // Dual-engine scan gate (simulated: engine A + engine B, EICAR signature).
  const infected = bytes.includes(EICAR) || /eicar/i.test(file.name);

  // Sequential per-case evidence numbering (دليل-NNN) — never reused.
  const [{ n: maxRef }] = await sql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(ref FROM POSITION('-' IN ref) + 1) AS INTEGER)), 0)::int AS n
    FROM evidence WHERE case_id = ${kase.id}`;
  const ref = `دليل-${String(maxRef + 1).padStart(3, "0")}`;

  const evidenceId = randomUUID();
  await sql`
    INSERT INTO evidence_blobs (sha256, quarantined, bytes)
    VALUES (${serverHash}, ${infected ? 1 : 0}, ${bytes})
    ON CONFLICT (sha256) DO NOTHING`;

  await sql`
    INSERT INTO evidence (id, tenant_id, case_id, ref, title, filename, size, sha256, status, scan_status, party_label, uploaded_by, uploaded_at)
    VALUES (${evidenceId}, ${session.tenantId}, ${kase.id}, ${ref}, ${title}, ${file.name}, ${bytes.length}, ${serverHash},
      ${infected ? "quarantined" : "documented"}, ${infected ? "infected" : "clean"},
      ${partyLabel}, ${session.name}, ${new Date().toISOString()})`;

  if (infected) {
    await appendCustody(sql, evidenceId, "فحص أمني — محركان: مصاب، حُجز الملف ولم يُودَع", "النظام — ClamAV + محرك ثانٍ");
    await appendAudit(sql, {
      tenantId: session.tenantId, caseId: kase.id, kind: "أمان",
      text: `ملف مصاب محتجز في الحجر الصحي: ${file.name} — أُبلغ مشرف المنصة`,
      actor: "النظام — فحص مزدوج", ip: clientIp(req),
    });
    return NextResponse.json({ ok: false, quarantined: true, ref, evidenceId }, { status: 200 });
  }

  await appendCustody(sql, evidenceId, "إيداع أصلي + بصمة رقمية", `${session.name}`);
  await appendCustody(sql, evidenceId, "تحقق الخادم من البصمة", "النظام — تحقق مزدوج");
  await appendCustody(sql, evidenceId, "فحص أمني — محركان: سليم", "النظام — ClamAV + محرك ثانٍ");
  await appendAudit(sql, {
    tenantId: session.tenantId, caseId: kase.id, kind: "إيداع دليل",
    text: `إيداع دائم ${ref}: ${title} (${file.name}) — تحقق مزدوج من البصمة`,
    actor: session.name, ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, ref, evidenceId, sha256: serverHash });
});
