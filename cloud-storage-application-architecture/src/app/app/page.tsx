"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Files,
  FolderOpen,
  Star,
  Trash2,
  Link2,
  LogIn,
  ShieldCheck,
  Sparkles,
  FolderPlus,
  Activity,
  ArrowLeft,
  HardDrive,
  FileVideo,
  FileAudio,
  FileImage,
  FileText,
  File as FileIcon,
  FileArchive,
  Clock,
} from "lucide-react";
import { PageLoader } from "@/components/ui";
import { StorageDonut, TrendBars, CategoryBar } from "@/components/charts";
import { useUpload } from "@/components/upload-provider";
import {
  formatBytes,
  timeAgo,
  fileCategory,
  CATEGORY_LABEL,
  CATEGORY_COLOR,
  type FileCategory,
} from "@/lib/utils";

type Stats = {
  storage: { usedBytes: number; limitBytes: number; percent: number };
  totals: { filesCount: number; foldersCount: number; favoritesCount: number; trashCount: number; trashBytes: number };
  categories: Record<string, { bytes: number; count: number }>;
  trend: { month: string; bytes: number }[];
  recentActivity: { id: string; type: string; detail: string; createdAt: string }[];
  largestFiles: { id: string; fileName: string; fileSizeBytes: number; mimeType: string }[];
};

const ACTIVITY_ICON: Record<string, typeof UploadCloud> = {
  upload: UploadCloud,
  delete: Trash2,
  share: Link2,
  login: LogIn,
  security: ShieldCheck,
  signup: Sparkles,
  folder: FolderPlus,
};

const MIME_ICON = (mime: string) => {
  const c = fileCategory(mime);
  switch (c) {
    case "image": return FileImage;
    case "video": return FileVideo;
    case "audio": return FileAudio;
    case "document": return FileText;
    case "archive": return FileArchive;
    default: return FileIcon;
  }
};

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "صباح الخير";
  if (h >= 12 && h < 17) return "طاب يومك";
  return "مساء الخير";
}

export default function DashboardPage() {
  const router = useRouter();
  const { enqueue, uploading } = useUpload();
  const [stats, setStats] = useState<Stats | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const [statsRes, meRes] = await Promise.all([
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (meRes.ok) setName((await meRes.json()).user?.name ?? "");
    })();
    const refresh = () => fetch("/api/stats", { cache: "no-store" }).then((r) => r.ok && r.json()).then((d) => d && setStats(d));
    window.addEventListener("sahaab:files-changed", refresh);
    return () => window.removeEventListener("sahaab:files-changed", refresh);
  }, []);

  const segments = useMemo(() => {
    if (!stats) return [];
    return (Object.keys(CATEGORY_LABEL) as FileCategory[]).map((key) => ({
      label: CATEGORY_LABEL[key],
      bytes: stats.categories[key]?.bytes ?? 0,
      color: CATEGORY_COLOR[key],
    }));
  }, [stats]);

  if (!stats) return <PageLoader label="جارٍ تحميل لوحة المعلومات…" />;

  const usedLabel = formatBytes(stats.storage.usedBytes);
  const firstName = name.split(" ")[0] || "صديقي";
  const today = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="space-y-6 fade-up">
      {/* ═══ الترحيب ═══ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-[#59617f]">{today}</p>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl mt-1">
            {greeting()}، <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className="text-[13px] text-[#8b93b8] mt-1.5">خزنتك آمنة ومشفّرة بالكامل — بذرة واحدة لا يملكها سواك.</p>
        </div>
        <label className="btn-primary cursor-pointer !text-sm">
          <UploadCloud size={17} />
          {uploading ? "جارٍ رفع ملفات…" : "رفع ملفات جديدة"}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) enqueue(files, null);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ═══ بطاقة التخزين ═══ */}
        <section className="glass rounded-3xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg flex items-center gap-2"><HardDrive size={19} className="text-cyan-300" /> مساحة التخزين</h2>
            <span className="chip !text-[10px] !text-cyan-200 !border-cyan-400/25 !bg-cyan-400/5">خطة 1 تيرابايت</span>
          </div>
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center">
            <div className="justify-self-center">
              <StorageDonut percent={stats.storage.percent} usedLabel={usedLabel} limitLabel="1 TB" size={170} />
            </div>
            <div className="min-w-0">
              <CategoryBar segments={segments} />
              <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                {segments.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#cdd3ee] leading-tight">{s.label}</p>
                      <p className="text-[9px] font-mono2 text-[#59617f]">{s.bytes > 0 ? formatBytes(s.bytes, 1) : "—"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-[11px] text-[#8b93b8] mb-1 flex items-center gap-1.5"><Clock size={12}/> الاستيعاب الشهري (آخر 6 أشهر)</p>
            <TrendBars data={stats.trend} />
          </div>
        </section>

        {/* ═══ عدادات سريعة ═══ */}
        <section className="grid grid-cols-2 gap-4">
          {[
            { icon: Files, label: "ملفاً", value: stats.totals.filesCount, tone: "text-cyan-300 bg-cyan-400/10", href: "/app/files" },
            { icon: FolderOpen, label: "مجلدات", value: stats.totals.foldersCount, tone: "text-violet-300 bg-violet-400/10", href: "/app/files" },
            { icon: Star, label: "مفضلة", value: stats.totals.favoritesCount, tone: "text-amber-300 bg-amber-400/10", href: "/app/favorites" },
            { icon: Trash2, label: "في السلة", value: stats.totals.trashCount, tone: "text-rose-300 bg-rose-400/10", href: "/app/trash" },
          ].map(({ icon: Icon, label, value, tone, href }, i) => (
            <Link key={i} href={href} className="glass-soft rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-400/20 transition-colors group">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <div className="mt-4">
                <p className="font-display font-extrabold text-2xl leading-none group-hover:text-white transition-colors">{value.toLocaleString("ar")}</p>
                <p className="text-[11px] text-[#8b93b8] mt-1">{label}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ═══ سجل النشاط ═══ */}
        <section className="glass rounded-3xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2"><Activity size={18} className="text-violet-300" /> آخر النشاطات</h2>
          </div>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-[#8b93b8] py-8 text-center">لا يوجد نشاط بعد — ارفع أول ملف وستراه هنا.</p>
          ) : (
            <ol className="relative border-r border-white/[0.07] mr-2 space-y-4">
              {stats.recentActivity.map((item) => {
                const Icon = ACTIVITY_ICON[item.type] ?? Activity;
                return (
                  <li key={item.id} className="relative pr-6">
                    <span className="absolute -right-[13px] top-0.5 h-6 w-6 rounded-full bg-[#11172b] border border-cyan-400/25 flex items-center justify-center">
                      <Icon size={12} className="text-cyan-300" />
                    </span>
                    <p className="text-[13px] text-[#cdd3ee] leading-6">{item.detail}</p>
                    <p className="text-[10px] text-[#59617f] mt-0.5">{timeAgo(item.createdAt)}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* ═══ الأكبر حجماً ═══ */}
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">الأكبر حجماً</h2>
            <button onClick={() => router.push("/app/files")} className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1">الكل <ArrowLeft size={12} /></button>
          </div>
          {stats.largestFiles.length === 0 ? (
            <p className="text-sm text-[#8b93b8] py-8 text-center">لا توجد ملفات بعد.</p>
          ) : (
            <ul className="space-y-3">
              {stats.largestFiles.map((f) => {
                const Icon = MIME_ICON(f.mimeType);
                const pct = stats.largestFiles[0] ? (f.fileSizeBytes / stats.largestFiles[0].fileSizeBytes) * 100 : 0;
                return (
                  <li key={f.id}>
                    <div className="flex items-center gap-2.5">
                      <Icon size={17} className="text-[#8b93b8] shrink-0" />
                      <p className="text-[12px] text-[#cdd3ee] truncate flex-1" title={f.fileName}>{f.fileName}</p>
                      <span className="text-[10px] font-mono2 text-[#8b93b8] shrink-0">{formatBytes(f.fileSizeBytes)}</span>
                    </div>
                    <div className="progress-track h-1 mt-1.5 mr-7" dir="ltr">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
