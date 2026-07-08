/**
 * Status → chip color trios (text / tint bg / border), per the design tokens.
 * Every status renders as the full trio, never text-only.
 */

export type ChipTone = "ok" | "warn" | "warnDeep" | "danger" | "info" | "neutral" | "ink";

export const TONE_CLASS: Record<ChipTone, string> = {
  ok: "text-ok bg-ok-bg border-ok-border",
  warn: "text-warn bg-warn-bg border-warn-border",
  warnDeep: "text-warn-deep bg-warn-bg border-warn-border",
  danger: "text-danger bg-danger-bg border-danger-border",
  info: "text-info bg-info-bg border-info-border",
  neutral: "text-t2 bg-chip border-chip-border",
  ink: "text-t1 bg-paper-alt border-[#d5d1c2]",
};

export const CASE_STAGE_TONE: Record<string, ChipTone> = {
  "تحليل": "warn",
  "تقرير": "ink",
  "أسئلة الأطراف": "info",
  "استلام": "neutral",
  "مُسلَّم": "ok",
};

export const EVIDENCE_STATUS_LABEL: Record<string, string> = {
  documented: "موثّق",
  analyzing: "قيد التحليل",
  disputed: "متنازع",
  quarantined: "مصاب — محتجز",
};

export const EVIDENCE_STATUS_TONE: Record<string, ChipTone> = {
  documented: "ok",
  analyzing: "warn",
  disputed: "danger",
  quarantined: "danger",
};

export const OBLIGATION_STATUS_TONE: Record<string, ChipTone> = {
  "منفذ": "ok",
  "غير منفذ": "danger",
  "متنازع": "danger",
  "غير مثبت": "warn",
};

export const LOG_KIND_TONE: Record<string, ChipTone> = {
  "اعتماد ذكاء": "info",
  "رفض ذكاء": "danger",
  "استشهاد": "warnDeep",
  "تصدير": "warnDeep",
  "إعدادات": "neutral",
  "معاينة": "ok",
  "أمان": "danger",
  "دخول": "neutral",
  "إيداع دليل": "ok",
  "إدارة": "neutral",
};

export const ROLE_LABEL: Record<string, string> = {
  systemic_rep: "الممثل النظامي",
  dept_manager: "مدير قسم",
  standard_user: "مستخدم قياسي",
  read_only: "قراءة فقط",
  external_consultant: "استشاري خارجي",
  platform_support: "دعم المنصة",
};

export const ROLE_TONE: Record<string, ChipTone> = {
  systemic_rep: "warnDeep",
  dept_manager: "info",
  standard_user: "ok",
  read_only: "neutral",
  external_consultant: "warn",
  platform_support: "neutral",
};
