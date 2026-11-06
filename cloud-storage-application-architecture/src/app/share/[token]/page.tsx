"use client";

export const runtime = "edge";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  Lock,
  Download,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  FileVideo,
  FileAudio,
  FileImage,
  FileText,
  File as FileIcon,
  CalendarClock,
  Eye,
} from "lucide-react";
import { cn, formatBytes, fileCategory } from "@/lib/utils";
import { b64ToBytes, decryptWholeFile } from "@/lib/crypto-client";

type ShareInfo = {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  chunkCount: number;
  expiresAt: string;
  url: string;
};

const MIME_ICON = (mime: string) => {
  switch (fileCategory(mime)) {
    case "image": return FileImage;
    case "video": return FileVideo;
    case "audio": return FileAudio;
    case "document": return FileText;
    default: return FileIcon;
  }
};

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const match = window.location.hash.match(/#k=([A-Za-z0-9_-]+)/);
        const fragmentKey = match?.[1] ?? null;

        const metaRes = await fetch(`/api/share/${token}`, { cache: "no-store" });
        const meta = await metaRes.json().catch(() => null);
        if (!metaRes.ok) {
          throw new Error(meta?.error ?? "تعذر فتح هذا الرابط");
        }
        if (cancelled) return;
        setInfo(meta);

        if (!fragmentKey) {
          setState("ready");
          setDecrypting(false);
          setError("الرابط ينقصه مفتاح الفك (#k=…) — اطلبه مرة أخرى من المُشارِك بصيغ��ه الكاملة.");
          return;
        }

        const stdB64 = fragmentKey.replace(/-/g, "+").replace(/_/g, "/");
        const key = await crypto.subtle.importKey("raw", b64ToBytes(stdB64) as BufferSource, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
        const buf = await (await fetch(meta.url)).arrayBuffer();
        const blob = await decryptWholeFile(key, buf, meta.fileSizeBytes, meta.chunkCount);
        objectUrl = URL.createObjectURL(new Blob([blob], { type: meta.mimeType }));
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setBlobUrl(objectUrl);
        setState("ready");
        setDecrypting(false);
      } catch (e) {
        if (cancelled) return;
        setState("error");
        setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
        setDecrypting(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token]);

  const category = info ? fileCategory(info.mimeType) : null;
  const Icon = info ? MIME_ICON(info.mimeType) : FileIcon;

  return (
    <div className="min-h-screen app-bg flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <Cloud size={20} className="text-white fill-white/20" />
        </div>
        <span className="font-display font-extrabold text-2xl">سحاب<span className="text-cyan-400">.</span></span>
      </Link>

      <div className="glass rounded-3xl w-full max-w-2xl overflow-hidden fade-up">
        {state === "loading" ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 size={34} className="animate-spin text-cyan-300" />
            <p className="text-sm text-[#8b93b8]">جارٍ جلب الملف وفك تشفيره محلياً…</p>
          </div>
        ) : state === "error" ? (
          <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/15 flex items-center justify-center">
              <AlertTriangle size={30} className="text-rose-400" />
            </div>
            <h1 className="font-display font-bold text-xl">تعذر فتح الرابط</h1>
            <p className="text-sm text-[#aab3d9] leading-7 max-w-md">{error}</p>
            <Link href="/" className="btn-ghost text-sm mt-2">العودة إلى سحاب</Link>
          </div>
        ) : info ? (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-white/5 flex flex-wrap items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center shrink-0">
                <Icon size={26} className="text-cyan-300" strokeWidth={1.6} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display font-bold text-lg leading-snug break-words">{info.fileName}</h1>
                <p className="text-[11px] text-[#8b93b8] mt-1 font-mono2">
                  {formatBytes(info.fileSizeBytes)} · {info.mimeType.split("/").pop()}
                </p>
              </div>
              <span className="chip !text-emerald-300 !border-emerald-400/25 !bg-emerald-400/5"><ShieldCheck size={12} /> مشفّر E2E</span>
            </div>

            <div className="p-5 min-h-64 flex items-center justify-center bg-black/30">
              {error ? (
                <div className="text-center py-10 px-4">
                  <AlertTriangle size={26} className="text-amber-300 mx-auto mb-3" />
                  <p className="text-sm text-amber-200/90 leading-7 max-w-md">{error}</p>
                </div>
              ) : decrypting ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 size={28} className="animate-spin text-cyan-300" />
                  <p className="text-xs text-[#8b93b8]">AES-256-GCM… تُفك الأجزاء في متصفحك</p>
                </div>
              ) : blobUrl && category === "image" ? (
                <img src={blobUrl} alt={info.fileName} className="max-h-[60vh] rounded-xl" />
              ) : blobUrl && category === "video" ? (
                <video src={blobUrl} controls autoPlay playsInline className="max-h-[60vh] w-full rounded-xl" />
              ) : blobUrl && category === "audio" ? (
                <audio src={blobUrl} controls autoPlay className="w-full max-w-md" />
              ) : (
                <div className="text-center py-10">
                  <Icon size={44} className="text-[#3d4468] mx-auto mb-4" strokeWidth={1.3} />
                  <p className="text-sm text-[#aab3d9]">هذا الملف جاهز للتنزيل</p>
                </div>
              )}
            </div>

            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-white/5">
              {blobUrl ? (
                <a href={blobUrl} download={info.fileName} className="btn-primary flex-1 justify-center">
                  <Download size={18} /> تنزيل الملف
                </a>
              ) : (
                <div className="btn-primary flex-1 justify-center opacity-40 pointer-events-none">
                  <Lock size={17} /> بانتظار مفتاح الفك
                </div>
              )}
              <div className="text-[10px] text-[#59617f] flex items-center gap-1.5 justify-center sm:justify-start">
                <CalendarClock size={12} /> ينقضي في {new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(info.expiresAt))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <p className="text-[10px] text-[#59617f] mt-6 flex items-center gap-1.5 max-w-md text-center leading-6">
        <Eye size={11} className="shrink-0" /> فُكّ هذا الملف بالكامل داخل متصفحك — كلمة المرور والمفتاح لم يغادرا جهاز المُرسِل.
      </p>
    </div>
  );
}
