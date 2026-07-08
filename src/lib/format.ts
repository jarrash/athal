const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Arabic-Indic numerals for prose and stat tiles (١٢، ٩٤). */
export function arabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);
}

/** Western-digit dd/mm/yyyy — always rendered LTR in mono per the design. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(iso)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Gregorian long date in Arabic, e.g. "الأحد 6 يوليو 2026م". */
export function gregorianLong(date = new Date()): string {
  const s = new Intl.DateTimeFormat("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
  }).format(date);
  return `${s.replace("،", "")}م`;
}

/** Hijri (Umm al-Qura) date, e.g. "21 محرم 1448هـ". */
export function hijriDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}هـ`;
}

export function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

/** Court-deadline countdown chip label, Arabic plural rules. */
export function countdownLabel(iso: string | null, delivered = false): string {
  if (delivered) return "أُودع التقرير";
  if (!iso) return "—";
  const d = daysUntil(iso);
  if (d < 0) return "متأخر " + (d === -1 ? "يوم" : arabicDigits(-d) + " أيام");
  if (d === 0) return "اليوم";
  if (d === 1) return "غدًا";
  if (d === 2) return "بعد يومين";
  if (d <= 10) return `بعد ${arabicDigits(d)} أيام`;
  return `بعد ${arabicDigits(d)} يومًا`;
}

/** Truncated hash for table cells: 7f83b165…9069 */
export function truncHash(hash: string): string {
  return hash.length <= 12 ? hash : `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}
