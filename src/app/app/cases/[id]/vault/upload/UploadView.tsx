"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Card, Chip, Mono, TableHead } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { truncHash } from "@/lib/format";

type PendingFile = {
  file: File;
  sha256: string | null; // null while hashing
  title: string;
  party: string;
  state: "hashing" | "ready" | "depositing" | "deposited" | "quarantined" | "error";
  ref?: string;
  error?: string;
};

const COLS = "1.3fr 90px 190px 1.2fr 130px";

async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadView({
  caseId,
  partyOptions,
}: {
  caseId: string;
  partyOptions: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [ack, setAck] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(list: FileList | File[]) {
    const items = Array.from(list).slice(0, 200);
    const startIdx = files.length;
    setFiles((prev) => [
      ...prev,
      ...items.map<PendingFile>((file) => ({
        file,
        sha256: null,
        title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
        party: "",
        state: "hashing",
      })),
    ]);
    items.forEach(async (file, i) => {
      const sha = await hashFile(file);
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === startIdx + i ? { ...f, sha256: sha, state: "ready" } : f
        )
      );
    });
  }

  const readyFiles = files.filter((f) => f.state === "ready");
  const complete = readyFiles.length > 0 && readyFiles.every((f) => f.title && f.party);
  const canDeposit = complete && ack;

  async function deposit() {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.state !== "ready") continue;
      setFiles((prev) => prev.map((x, idx) => (idx === i ? { ...x, state: "depositing" } : x)));
      const form = new FormData();
      form.set("file", f.file);
      form.set("title", f.title);
      form.set("partyLabel", f.party);
      form.set("clientSha256", f.sha256 ?? "");
      form.set("ack", "1");
      const res = await fetch(`/api/cases/${caseId}/evidence`, { method: "POST", body: form });
      const data = await res.json();
      setFiles((prev) =>
        prev.map((x, idx) =>
          idx === i
            ? res.ok
              ? data.quarantined
                ? { ...x, state: "quarantined", ref: data.ref }
                : { ...x, state: "deposited", ref: data.ref }
              : { ...x, state: "error", error: data.error }
            : x
        )
      );
    }
    toast("اكتملت معالجة الدفعة — راجع النتائج ثم عد إلى الخزنة");
    router.refresh();
  }

  return (
    <main className="fade-up flex flex-col gap-4 px-6 py-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-[18px] font-bold text-t1">رفع أدلة — إيداع دائم</h2>
        <Chip tone="warn">الإيداع نهائي — تصحيح أي ملف يكون بدليل جديد مستقل الترقيم</Chip>
        <div className="flex-1" />
        <Link href={`/app/cases/${caseId}/vault`} className="text-[11.5px] text-t3 underline hover:text-t1">
          ← العودة إلى الخزنة
        </Link>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-[2px] border-2 border-dashed px-6 py-10 ${
          dragOver ? "border-gold bg-fresh" : "border-line bg-white"
        }`}
      >
        <span className="text-[26px] text-muted">⇪</span>
        <span className="text-[13.5px] font-semibold text-t1">اسحب الملفات هنا أو تصفح الجهاز</span>
        <span className="text-[11px] text-t3">حتى ٢٠٠ ملف في الدفعة — تُحسب بصمة SHA-256 محليًا قبل الرفع</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </button>

      {files.length > 0 && (
        <Card className="overflow-hidden">
          <TableHead cols={COLS}>
            <span>الملف</span><span>الحجم</span><span>SHA-256</span><span>البيانات الوصفية</span><span>الحالة</span>
          </TableHead>
          {files.map((f, i) => (
            <div key={i} className="grid items-center gap-3 border-b border-divider bg-white px-[18px] py-3" style={{ gridTemplateColumns: COLS }}>
              <Mono className="overflow-hidden text-ellipsis whitespace-nowrap text-end text-[10.5px] text-t1">
                {f.file.name}
              </Mono>
              <Mono className="text-[10px] text-t3">{fmtSize(f.file.size)}</Mono>
              {f.sha256 ? (
                <Mono className="text-[9px] text-ok">✓ {truncHash(f.sha256)}</Mono>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="skeleton h-2 w-20" />
                  <Mono className="text-[9px] text-t4">hashing…</Mono>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <input
                  value={f.title}
                  disabled={f.state !== "ready"}
                  onChange={(e) => setFiles((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
                  placeholder="نوع الدليل / وصفه"
                  className="w-0 flex-1 rounded-[2px] border border-line bg-paper px-2 py-1 text-[11px] outline-none focus:border-gold"
                />
                <select
                  value={f.party}
                  disabled={f.state !== "ready"}
                  onChange={(e) => setFiles((prev) => prev.map((x, idx) => (idx === i ? { ...x, party: e.target.value } : x)))}
                  className={`rounded-[2px] border px-1.5 py-1 text-[10.5px] outline-none ${
                    f.party ? "border-line bg-paper text-t1" : "border-danger-border bg-danger-bg text-danger"
                  }`}
                >
                  <option value="">الطرف — مطلوب</option>
                  {partyOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </span>
              {f.state === "hashing" && <Chip tone="warn">جارٍ حساب البصمة</Chip>}
              {f.state === "ready" && (f.party && f.title ? <Chip tone="ok">جاهز للإيداع</Chip> : <Chip tone="danger">بيانات ناقصة — إكمال</Chip>)}
              {f.state === "depositing" && <Chip tone="warn">جارٍ الإيداع…</Chip>}
              {f.state === "deposited" && <Chip tone="ok">✓ أُودع — {f.ref}</Chip>}
              {f.state === "quarantined" && <Chip tone="danger">مصاب — محتجز، أُبلغ المشرف</Chip>}
              {f.state === "error" && <Chip tone="danger">{f.error ?? "خطأ"}</Chip>}
            </div>
          ))}
        </Card>
      )}

      <div className="flex items-center gap-4 rounded-[2px] bg-ink px-5 py-4 shadow-panel">
        <label className="flex cursor-pointer items-center gap-2.5 text-[12px] font-semibold text-paper">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="h-4 w-4 accent-[#C8A84B]" />
          أقرّ بأن الملفات أصلية وكاملة، وأدرك أن الإيداع دائم ولا يمكن التراجع عنه
        </label>
        <div className="flex-1" />
        <span className="text-[10px] text-navtext">يُفحص كل ملف بمحركين قبل الإيداع · تصدر شهادة بصمة لكل ملف</span>
        <button
          disabled={!canDeposit}
          onClick={deposit}
          className={`rounded-[2px] px-5 py-2.5 text-[12.5px] font-bold ${
            canDeposit
              ? "cursor-pointer bg-gold text-ink shadow-btn hover:bg-gold-hover"
              : "cursor-not-allowed bg-ink-hover text-t3d"
          }`}
        >
          إيداع دائم
        </button>
      </div>
    </main>
  );
}
