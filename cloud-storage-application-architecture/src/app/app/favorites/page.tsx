"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Download, Trash2, Loader2, FileVideo, FileAudio, FileImage, FileText, File as FileIcon, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes, fileCategory } from "@/lib/utils";
import { EmptyState, PageLoader } from "@/components/ui";
import EncryptedThumb from "@/components/encrypted-thumb";
import { decryptWholeFile } from "@/lib/crypto-client";
import { ensureVaultKey } from "@/lib/vault";

type FavFile = {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  thumbnailKey: string | null;
  chunkCount: number;
  createdAt: string;
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

export default function FavoritesPage() {
  const [files, setFiles] = useState<FavFile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/favorites", { cache: "no-store" });
    if (res.ok) setFiles((await res.json()).files);
    else setFiles([]);
  }, []);

  useEffect(() => {
    reload();
    const onChanged = () => reload();
    window.addEventListener("sahaab:files-changed", onChanged);
    return () => window.removeEventListener("sahaab:files-changed", onChanged);
  }, [reload]);

  const toggleFavorite = useCallback(async (file: FavFile) => {
    setFiles((prev) => prev?.filter((f) => f.id !== file.id) ?? null);
    await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: false }),
    });
    toast.success("أُزيلت من المفضلة");
  }, []);

  const download = useCallback(async (file: FavFile) => {
    setBusyId(file.id);
    try {
      const metaRes = await fetch(`/api/files/${file.id}/url`);
      const meta = await metaRes.json();
      const key = await ensureVaultKey();
      if (!key) return;
      const buf = await (await fetch(meta.url)).arrayBuffer();
      const blob = await decryptWholeFile(key, buf, meta.file.fileSizeBytes, meta.file.chunkCount);
      const url = URL.createObjectURL(new Blob([blob], { type: meta.file.mimeType }));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("تعذر فك تشفير الملف");
    } finally {
      setBusyId(null);
    }
  }, []);

  if (!files) return <PageLoader label="جارٍ تحميل مفضّلتك…" />;

  return (
    <div className="fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl flex items-center gap-2.5"><Star size={23} className="text-amber-300 fill-amber-300/30" /> المفضلة</h1>
          <p className="text-xs text-[#8b93b8] mt-1.5">{files.length} ملف يصل إليه بنقرة واحدة</p>
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState
          icon={Star}
          title="لا توجد ملفات مفضلة بعد"
          hint="اضغط زر النجمة على أي ملف من مستكشف الملفات — وستجده هنا للأبد."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {files.map((file) => {
            const Icon = MIME_ICON(file.mimeType);
            return (
              <div key={file.id} className="file-card glass-soft rounded-2xl overflow-hidden relative group">
                <button
                  onClick={() => toggleFavorite(file)}
                  className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/45 backdrop-blur hover:bg-black/65 transition-colors"
                  aria-label="إزالة من المفضلة"
                  title="إزالة من المفضلة"
                >
                  <Star size={14} className="text-amber-300 fill-amber-300" />
                </button>
                <div className="h-32 w-full">
                  {file.thumbnailKey ? (
                    <EncryptedThumb fileId={file.id} className="h-full w-full" />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Icon size={34} className="text-[#3d4468]" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-medium truncate" title={file.fileName}>{file.fileName}</p>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-[9px] font-mono2 text-[#59617f]">{formatBytes(file.fileSizeBytes)}</span>
                    <button
                      onClick={() => download(file)}
                      disabled={busyId === file.id}
                      className="p-1.5 rounded-lg text-[#8b93b8] hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                      aria-label="تنزيل وفك التشفير"
                      title="تنزيل وفك التشفير"
                    >
                      {busyId === file.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
