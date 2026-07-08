import { TONE_CLASS, type ChipTone } from "@/lib/status";
import type { ReactNode } from "react";

/** Status pill — always the full text/tint/border trio. */
export function Chip({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2 py-[2.5px] text-[10.5px] font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Monospace data field — case numbers, hashes, dates. Always LTR. */
export function Mono({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <span className={`mono-ltr ${className}`}>{children}</span>;
}

/** Evidence reference chip (دليل-014) — dark ink block with gold mono text. */
export function EvidenceRef({
  refCode,
  className = "",
}: {
  refCode: string;
  className?: string;
}) {
  return (
    <span
      className={`mono-ltr inline-flex items-center rounded-[2px] bg-ink px-[7px] py-[2px] text-[10.5px] font-semibold text-gold ${className}`}
    >
      {refCode}
    </span>
  );
}

/** Inline citation chip inside report prose — warm gold tint, clickable. */
export function CitationChip({ refCode }: { refCode: string }) {
  return (
    <span className="mono-ltr mx-0.5 inline-flex cursor-pointer items-center rounded-[2px] border border-warn-border bg-warn-bg px-[7px] py-[1px] align-middle text-[10px] font-semibold text-warn-deep hover:bg-[#eee1bd]">
      {refCode}
    </span>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[2px] border border-line bg-white shadow-card ${className}`}>
      {children}
    </div>
  );
}

/** Table header row wrapper with the signature gold inset top rule. */
export function TableHead({
  cols,
  children,
}: {
  cols: string;
  children: ReactNode;
}) {
  return (
    <div
      className="gold-toprule grid items-center gap-3 border-b border-line bg-paper px-[18px] py-2.5 text-[10.5px] font-bold text-t3"
      style={{ gridTemplateColumns: cols }}
    >
      {children}
    </div>
  );
}
