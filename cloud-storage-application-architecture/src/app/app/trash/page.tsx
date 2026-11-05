"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, RotateCcw, XCircle, Loader2, FileVideo, FileAudio, FileImage, FileText, File as FileIcon, FileArchive, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatBytes, formatDate, fileCategory } from "@/lib/utils";
import { EmptyState, PageLoader, ConfirmDialog } from "@/components/ui";
import EncryptedThumb from "@/components/encrypted-thumb";

type TrashFile = {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  thumbnailKey: string | null;
  trashedAt: string | null;
};

const MIME_ICON = (mime: string) => {
  switch (fileCategory(mime)) {
    case "image": return FileImage;
    case "video": return FileVideo;
    case "audio": return FileAudio;
    case "document": return FileText;
    case "archive": return FileArchive;
    default: return FileIcon;
  }
};

export default function TrashPage() {
  const [files, setFiles] = useState<TrashFile[] | null>(null);
  const [permanentTarget, setPermanentTarget] = useState<TrashFile | null>(null);
  const [emptyAll, setEmptyAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/trash", { cache: "no-store" });
    if (res.ok) setFiles((await res.json()).files);
    else setFiles([]);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const restore = useCallback(async (file: TrashFile) => {
    await fetch(`/api/files/${file.id}/restore`, { method: "POST" });
    toast.success(`استُعيد «${file.fileName}»`);
    setFiles((prev) => prev?.filter((f) => f.id !== file.id) ?? null);
    window.dispatchEvent(new CustomEvent("sahaab:files-changed"));
  }, []);

  const deleteForever = useCallback(async (file: TrashFile) => {
    setBusy(true);
    await fetch(`/api/files/${file.id}/permanent`, { method: "DELETE" });
    toast.success("حُذف الملف نهائياً واستُردّت مساحته");
    setFiles((prev) => prev?.filter((f) => f.id !== file.id) ?? null);
    setBusy(false);
    window.dispatchEvent(new CustomEvent("sahaab:files-changed"));
  }, []);

  const emptyTrash = useCallback(async () => {
    setBusy(true);
    const res = await fetch("/api/trash", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    toast.success(`أُفرغت السلة — حُذف ${data.purged ?? 0} ملف واستُردّت ${formatBytes(Number(data.freedBytes ?? 0))}`);
    setFiles([]);
    setBusy(false);
    window.dispatchEvent(new CustomEvent("sahaab:files-changed"));
  }, []);

  if (!files) return <PageLoader label="جارٍ تحميل السلة…" />;
  const totalBytes = files.reduce((sum, f) => sum + f.fileSizeBytes, 0);

  return (
    <div className="fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl flex items-center gap-2.5"><Trash2 size={23} className="text-rose-300" /> سلة المحذوفات</h1>
          <p className="text-xs text-[#8b93b8] mt-1.5">
            {files.length} ملف · {formatBytes(totalBytes)} مازالت محجوزة من سعتك
          </p>
        </div>
        {files.length > 0 && (
          <button onClick={() => setEmptyAll(true)} className="text-xs font-semibold text-rose-300 border border-rose-400/30 bg-rose-400/5 hover:bg-rose-400/15 rounded-xl px-4 py-2.5 flex items-center gap-2 transition-colors">
            <XCircle size={15} /> إفراغ السلة نهائياً
          </button>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-amber-300/90 bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3 mb-5 leading-6">
          <AlertTriangle size={15} className="shrink-0" /> الملفات في السلة مازالت تستهلك من تيرابايتك — الحذف النهائي يسترد المساحة فوراً في قاعدة البيانات.
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState icon={Trash2} title="السلة فارغة" hint="كل ما تحذفه يظهر هنا أولاً — يمكنك استعادته بضغطة زر." />
      ) : (
        <ul className="space-y-2">
          {files.map((file) => {
            const Icon = MIME_ICON(file.mimeType);
            return (
              <li key={file.id} className="glass-soft rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-white/[0.03] flex items-center justify-center">
                  {file.thumbnailKey ? <EncryptedThumb fileId={file.id} className="h-full w-full" /> : <Icon size={22} className="text-[#3d4468]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate" title={file.fileName}>{file.fileName}</p>
                  <p className="text-[10px] text-[#59617f] mt-0.5">
                    {formatBytes(file.fileSizeBytes)} · حُذف {file.trashedAt ? formatDate(file.trashedAt) : ""}
                  </p>
                </div>
                <button onClick={() => restore(file)} className="p-2.5 rounded-xl text-emerald-300 hover:bg-emerald-400/10 transition-colors" title="استعادة" aria-label="استعادة">
                  <RotateCcw size={18} />
                </button>
                <button onClick={() => setPermanentTarget(file)} className="p-2.5 rounded-xl text-rose-300 hover:bg-rose-400/10 transition-colors" title="حذف نهائي" aria-label="حذف نهائي">
                  <XCircle size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(permanentTarget)}
        onClose={() => setPermanentTarget(null)}
        title="حذف نهائي"
        message={`سيُمحى «${permanentTarget?.fileName}» وكل أجزائه المشفرة من التخزين نهائياً — لا يمكن التراجع.`}
        confirmLabel="حذف نهائياً"
        danger
        onConfirm={() => permanentTarget && deleteForever(permanentTarget)}
      />
      <ConfirmDialog
        open={emptyAll}
        onClose={() => setEmptyAll(false)}
        title="إفراغ السلة"
        message={`سيُحذف ${files.length} ملف نهائياً وتُسترد ${formatBytes(totalBytes)} من مساحتك. لا يمكن التراجع.`}
        confirmLabel={busy ? "جارٍ الحذف…" : "إفراغ السلة"}
        danger
        onConfirm={emptyTrash}
      />
    </div>
  );
}
