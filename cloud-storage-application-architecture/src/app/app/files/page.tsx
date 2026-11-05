"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Folder,
  FolderPlus,
  Upload,
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  Star,
  Download,
  Trash2,
  Pencil,
  FolderInput,
  Share2,
  Eye,
  ChevronLeft,
  Home,
  X,
  Check,
  FileVideo,
  FileAudio,
  FileImage,
  FileText,
  File as FileIcon,
  FileArchive,
  CheckCircle2,
  CloudUpload,
  Loader2,
  ShieldCheck,
  Link2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes, formatDate, fileCategory, type FileCategory } from "@/lib/utils";
import { EmptyState, Modal, ConfirmDialog, PageLoader, Spinner } from "@/components/ui";
import { useUpload } from "@/components/upload-provider";
import { decryptWholeFile } from "@/lib/crypto-client";
import { ensureVaultKey, getRawVaultKey } from "@/lib/vault";
import EncryptedThumb from "@/components/encrypted-thumb";

type XFolder = { id: string; name: string; createdAt: string };
type XFile = {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  thumbnailKey: string | null;
  isFavorite: boolean;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};
type Explorer = {
  folderId: string | null;
  breadcrumbs: { id: string; name: string }[];
  folders: XFolder[];
  files: XFile[];
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
const MIME_COLOR = (mime: string) => {
  switch (fileCategory(mime)) {
    case "image": return "text-cyan-300 bg-cyan-400/10";
    case "video": return "text-violet-300 bg-violet-400/10";
    case "audio": return "text-pink-300 bg-pink-400/10";
    case "document": return "text-emerald-300 bg-emerald-400/10";
    case "archive": return "text-amber-300 bg-amber-400/10";
    default: return "text-slate-300 bg-slate-400/10";
  }
};

export default function FilesPage() {
  return (
    <Suspense fallback={<PageLoader label="جارٍ فتح ملفاتك…" />}>
      <FilesExplorer />
    </Suspense>
  );
}

function FilesExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folderId");
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const { enqueue, uploading } = useUpload();

  const [data, setData] = useState<Explorer | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"date" | "name" | "size" | "type">("date");
  const [filter, setFilter] = useState<"all" | FileCategory>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ x: number; y: number; kind: "file" | "folder"; item: XFile | XFolder } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ kind: "file" | "folder"; id: string; value: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "file" | "folder"; id: string; name: string } | null>(null);
  const [deleteBulk, setDeleteBulk] = useState(false);
  const [moveFiles, setMoveFiles] = useState<XFile[] | null>(null);
  const [shareFile, setShareFile] = useState<XFile | null>(null);
  const [previewFile, setPreviewFile] = useState<XFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sahaab.view");
    if (saved === "list" || saved === "grid") setView(saved);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/explorer?${folderId ? `folderId=${encodeURIComponent(folderId)}` : ""}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
      else if (res.status === 404) {
        toast.error("المجلد غير موجود — عدنا إلى الجذر");
        router.replace("/app/files");
      }
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  }, [folderId, router]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onChanged = () => reload();
    window.addEventListener("sahaab:files-changed", onChanged);
    return () => window.removeEventListener("sahaab:files-changed", onChanged);
  }, [reload]);

  const filteredFolders = useMemo(() => {
    if (!data) return [];
    return data.folders.filter((f) => !query || f.name.toLowerCase().includes(query));
  }, [data, query]);

  const filteredFiles = useMemo(() => {
    if (!data) return [];
    let rows = data.files.filter((f) => {
      if (query && !f.fileName.toLowerCase().includes(query)) return false;
      if (filter !== "all" && fileCategory(f.mimeType) !== filter) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "name": return a.fileName.localeCompare(b.fileName, "ar");
        case "size": return b.fileSizeBytes - a.fileSizeBytes;
        case "type": return a.mimeType.localeCompare(b.mimeType);
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return rows;
  }, [data, query, filter, sort]);

  const openFolder = useCallback((id: string | null) => {
    router.push(id ? `${pathname}?folderId=${id}` : pathname);
  }, [pathname, router]);

  const toggleFavorite = useCallback(async (file: XFile) => {
    setData((prev) => prev && { ...prev, files: prev.files.map((f) => (f.id === file.id ? { ...f, isFavorite: !f.isFavorite } : f)) });
    await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !file.isFavorite }),
    });
  }, []);

  const downloadFile = useCallback(async (file: XFile) => {
    const metaRes = await fetch(`/api/files/${file.id}/url`);
    if (!metaRes.ok) return toast.error("تعذر تجهيز الرابط");
    const meta = await metaRes.json();
    const key = await ensureVaultKey();
    if (!key) return;
    const toastId = toast.loading(`جارٍ فك تشفير «${file.fileName}»…`);
    try {
      const buf = await (await fetch(meta.url)).arrayBuffer();
      const blob = await decryptWholeFile(key, buf, meta.file.fileSizeBytes, meta.file.chunkCount);
      const url = URL.createObjectURL(new Blob([blob], { type: meta.file.mimeType }));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("اكتمل التنزيل وفك التشفير", { id: toastId });
    } catch {
      toast.error("تعذر فك تشفير الملف — ربما كلمة المرور غير مطابقة", { id: toastId });
    }
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    toast.success("نُقل الملف إلى السلة");
    reload();
  }, [reload]);

  const deleteFolder = useCallback(async (id: string) => {
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("نُقل المجلد ومحتواه إلى السلة");
    else toast.error("تعذر حذف المجلد");
    reload();
  }, [reload]);

  const doRename = useCallback(async () => {
    if (!renameTarget) return;
    const name = renameTarget.value.trim();
    if (name.length < 1) return;
    const url = renameTarget.kind === "file" ? `/api/files/${renameTarget.id}` : `/api/folders/${renameTarget.id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) toast.success("تم تغيير الاسم");
    else toast.error((await res.json().catch(() => ({}))).error ?? "تعذر تغيير الاسم");
    setRenameTarget(null);
    reload();
  }, [renameTarget, reload]);

  const createFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId: folderId }),
    });
    if (res.ok) toast.success(`أُنشئ المجلد «${name}»`);
    setNewFolderName("");
    setNewFolderOpen(false);
    reload();
  }, [folderId, newFolderName, reload]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkDelete = useCallback(async () => {
    for (const id of selected) await fetch(`/api/files/${id}`, { method: "DELETE" });
    toast.success(`نُقل ${selected.size} ملفاً إلى السلة`);
    setSelected(new Set());
    setDeleteBulk(false);
    reload();
  }, [reload, selected]);

  const bulkFavorite = useCallback(async () => {
    for (const id of selected)
      await fetch(`/api/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: true }),
      });
    toast.success("أُضيفت إلى المفضلة");
    setSelected(new Set());
    reload();
  }, [reload, selected]);

  const openMenu = useCallback((e: React.MouseEvent, kind: "file" | "folder", item: XFile | XFolder) => {
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setMenu({ x, y, kind, item });
  }, []);

  const startRename = useCallback((kind: "file" | "folder", item: XFile | XFolder) => {
    const value = kind === "file" ? (item as XFile).fileName : (item as XFolder).name;
    setRenameTarget({ kind, id: item.id, value });
    setMenu(null);
  }, []);

  const folderName = data?.breadcrumbs.at(-1)?.name ?? "ملفاتي";
  const isEmpty = data && filteredFolders.length === 0 && filteredFiles.length === 0;

  return (
    <div
      className="relative fade-up"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) enqueue(files, folderId);
      }}
    >
      {/* غلاف الإفلات */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-[#05070f]/70 backdrop-blur-sm p-8">
          <div className="border-2 border-dashed border-cyan-400/60 rounded-3xl px-16 py-14 flex flex-col items-center gap-4 bg-cyan-400/[0.04]">
            <CloudUpload size={56} className="text-cyan-300" strokeWidth={1.5} />
            <p className="font-display font-bold text-xl">أفلت للرفع إلى «{folderName}»</p>
            <p className="text-xs text-[#8b93b8]">سيُشفَّر كل ملف محلياً ثم يُرفع مجزأً بأربعة خيوط</p>
          </div>
        </div>
      )}

      {/* ═══ شريط الأدوات ═══ */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* مسار التنقل */}
        <nav className="flex items-center gap-1 text-sm overflow-x-auto flex-1 min-w-0 py-1" aria-label="مسار المجلدات">
          <button onClick={() => openFolder(null)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#aab3d9] hover:text-white hover:bg-white/5 transition-colors shrink-0">
            <Home size={15} /> ملفاتي
          </button>
          {data?.breadcrumbs.map((crumb, i) => {
            const isLast = i === (data?.breadcrumbs.length ?? 0) - 1;
            return (
              <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                <ChevronLeft size={14} className="text-[#3d4468]" />
                <button
                  onClick={() => openFolder(crumb.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg transition-colors max-w-44 truncate",
                    isLast ? "text-cyan-200 font-semibold bg-cyan-400/10" : "text-[#aab3d9] hover:text-white hover:bg-white/5"
                  )}
                >
                  {crumb.name}
                </button>
              </span>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* فرز */}
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="input !w-auto !py-2 !text-xs" aria-label="الترتيب">
            <option value="date">الأحدث أولاً</option>
            <option value="name">الاسم</option>
            <option value="size">الحجم</option>
            <option value="type">النوع</option>
          </select>
          {/* تصفية */}
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="input !w-auto !py-2 !text-xs" aria-label="تصفية">
            <option value="all">كل الأنواع</option>
            <option value="image">صور</option>
            <option value="video">فيديو</option>
            <option value="audio">صوت</option>
            <option value="document">مستندات</option>
            <option value="archive">أرشيف</option>
            <option value="other">أخرى</option>
          </select>
          {/* تبديل العرض */}
          <div className="flex rounded-xl border border-[var(--panel-border)] p-1 bg-white/[0.02]">
            {([
              { mode: "grid", icon: LayoutGrid, label: "شبكة" },
              { mode: "list", icon: List, label: "قائمة" },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => {
                  setView(mode);
                  localStorage.setItem("sahaab.view", mode);
                }}
                className={cn("p-2 rounded-lg transition-colors", view === mode ? "bg-cyan-400/15 text-cyan-300" : "text-[#8b93b8] hover:text-white")}
                aria-label={label}
                aria-pressed={view === mode}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>
          <button className="btn-ghost !py-2 !text-xs" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus size={16} /> مجلد
          </button>
          <button className="btn-primary !py-2 !text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> رفع
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) enqueue(files, folderId);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {query && (
        <p className="text-xs text-[#8b93b8] mb-3">
          نتائج البحث عن «<span className="text-cyan-300">{query}</span>» — {filteredFiles.length + filteredFolders.length} نتيجة
        </p>
      )}

      {/* ═══ المحتوى ═══ */}
      {loading || !data ? (
        <PageLoader label="جارٍ تحميل المجلد…" />
      ) : isEmpty ? (
        <EmptyState
          icon={query ? Search : Folder}
          title={query ? "لا توجد نتائج مطابقة" : "هذا المجلد فارغ"}
          hint={query ? "جرّب كلمة أخرى أو غيّر المرشحات." : "ارفع ملفاتك بالسحب والإفلات — ستُشفّر محلياً قبل مغادرة جهازك."}
          action={
            !query && (
              <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={17} /> ارفع أول ملف
              </button>
            )
          }
        />
      ) : (
        <>
          {/* المجلدات */}
          {filteredFolders.length > 0 && (
            <>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#59617f] mb-2">المجلدات ({filteredFolders.length})</p>
              <div className={cn(view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6" : "space-y-2 mb-6")}>
                {filteredFolders.map((folder) =>
                  view === "grid" ? (
                    <button
                      key={folder.id}
                      onClick={() => openFolder(folder.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openMenu(e, "folder", folder);
                      }}
                      className="file-card glass-soft rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center relative group"
                    >
                      <button
                        onClick={(e) => openMenu(e, "folder", folder)}
                        className="absolute top-2 left-2 p-1.5 rounded-lg text-[#59617f] hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="خيارات المجلد"
                      >
                        <MoreVertical size={16} />
                      </button>
                      <Folder size={46} strokeWidth={1.4} className="text-amber-300/90 fill-amber-400/20" />
                      <span className="text-xs font-medium truncate w-full" title={folder.name}>{folder.name}</span>
                    </button>
                  ) : (
                    <div key={folder.id} className="glass-soft rounded-xl px-4 py-3 flex items-center gap-3 group">
                      <button onClick={() => openFolder(folder.id)} className="flex items-center gap-3 min-w-0 flex-1 text-right">
                        <Folder size={26} strokeWidth={1.5} className="text-amber-300/90 fill-amber-400/20 shrink-0" />
                        <span className="text-sm font-medium truncate">{folder.name}</span>
                      </button>
                      <button onClick={(e) => openMenu(e, "folder", folder)} className="p-2 rounded-lg text-[#59617f] hover:text-white hover:bg-white/5" aria-label="خيارات">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  )
                )}
              </div>
            </>
          )}

          {/* الملفات */}
          {filteredFiles.length > 0 && (
            <>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#59617f] mb-2">الملفات ({filteredFiles.length})</p>
              {view === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredFiles.map((file) => {
                    const Icon = MIME_ICON(file.mimeType);
                    const isSelected = selected.has(file.id);
                    return (
                      <div
                        key={file.id}
                        onDoubleClick={() => setPreviewFile(file)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          openMenu(e, "file", file);
                        }}
                        className={cn(
                          "file-card glass-soft rounded-2xl overflow-hidden relative group cursor-pointer",
                          isSelected && "ring-2 ring-cyan-400/70 border-cyan-400/40"
                        )}
                        onClick={() => (selected.size > 0 ? toggleSelect(file.id) : setPreviewFile(file))}
                      >
                        {/* خانة التحديد */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(file.id);
                          }}
                          className={cn(
                            "absolute top-2 right-2 z-10 h-6 w-6 rounded-md border flex items-center justify-center transition-all",
                            isSelected ? "bg-cyan-400 border-cyan-400 text-slate-950" : "border-white/25 bg-black/40 text-transparent opacity-0 group-hover:opacity-100"
                          )}
                          aria-label="تحديد"
                          aria-pressed={isSelected}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(file);
                          }}
                          className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/40 backdrop-blur hover:bg-black/60 transition-colors"
                          aria-label={file.isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
                        >
                          <Star size={14} className={file.isFavorite ? "text-amber-300 fill-amber-300" : "text-white/70"} />
                        </button>

                        {/* المصغّر */}
                        <div className="h-32 w-full relative">
                          {file.thumbnailKey ? (
                            <EncryptedThumb fileId={file.id} className="h-full w-full" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-white/[0.03] to-transparent">
                              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", MIME_COLOR(file.mimeType))}>
                                <Icon size={28} strokeWidth={1.6} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* البيانات الوصفية */}
                        <div className="p-3">
                          <p className="text-[11px] font-medium truncate" title={file.fileName}>{file.fileName}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] font-mono2 text-[#59617f]">{formatBytes(file.fileSizeBytes)}</span>
                            <button onClick={(e) => openMenu(e, "file", file)} className="p-1 rounded text-[#59617f] hover:text-white" aria-label="خيارات">
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-soft rounded-2xl overflow-hidden divide-y divide-white/5">
                  {filteredFiles.map((file) => {
                    const Icon = MIME_ICON(file.mimeType);
                    const isSelected = selected.has(file.id);
                    return (
                      <div
                        key={file.id}
                        className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer", isSelected && "bg-cyan-400/[0.06]")}
                        onClick={() => (selected.size > 0 ? toggleSelect(file.id) : setPreviewFile(file))}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(file.id);
                          }}
                          className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center shrink-0",
                            isSelected ? "bg-cyan-400 border-cyan-400 text-slate-950" : "border-white/20 text-transparent"
                          )}
                          aria-label="تحديد"
                        >
                          <Check size={12} strokeWidth={3.5} />
                        </button>
                        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", MIME_COLOR(file.mimeType))}>
                          <Icon size={18} />
                        </div>
                        <p className="text-[13px] truncate flex-1" title={file.fileName}>{file.fileName}</p>
                        <span className="hidden md:block text-[10px] text-[#59617f] w-28 shrink-0">{formatDate(file.createdAt)}</span>
                        <span className="text-[10px] font-mono2 text-[#8b93b8] w-20 text-left shrink-0" dir="ltr">{formatBytes(file.fileSizeBytes)}</span>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(file); }} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="مفضلة">
                          <Star size={15} className={file.isFavorite ? "text-amber-300 fill-amber-300" : "text-[#59617f]"} />
                        </button>
                        <button onClick={(e) => openMenu(e, "file", file)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#59617f] hover:text-white" aria-label="خيارات">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ شريط التحديد الجماعي ═══ */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 glass rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl fade-up">
          <span className="text-sm font-semibold text-cyan-200">{selected.size} محدد</span>
          <div className="h-5 w-px bg-white/10" />
          <button className="text-xs flex items-center gap-1.5 text-[#cdd3ee] hover:text-white" onClick={() => bulkFavorite()}>
            <Star size={15} /> مفضلة
          </button>
          <button
            className="text-xs flex items-center gap-1.5 text-[#cdd3ee] hover:text-white"
            onClick={() => setMoveFiles(filteredFiles.filter((f) => selected.has(f.id)))}
          >
            <FolderInput size={15} /> نقل
          </button>
          <button className="text-xs flex items-center gap-1.5 text-rose-300 hover:text-rose-200" onClick={() => setDeleteBulk(true)}>
            <Trash2 size={15} /> حذف
          </button>
          <button className="p-1.5 text-[#8b93b8] hover:text-white" onClick={() => setSelected(new Set())} aria-label="إلغاء التحديد">
            <X size={16} />
          </button>
        </div>
      )}

      {/* قائمة السياق */}
      {menu && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(null)} aria-label="إغلاق" />
          <div className="fixed z-50 glass rounded-xl p-1.5 w-52 shadow-2xl fade-up" style={{ left: menu.x, top: menu.y }} role="menu">
            {menu.kind === "file" ? (
              <>
                <button className="menu-item" onClick={() => { setPreviewFile(menu.item as XFile); setMenu(null); }}><Eye size={15} /> فتح / معاينة</button>
                <button className="menu-item" onClick={() => { downloadFile(menu.item as XFile); setMenu(null); }}><Download size={15} /> تنزيل وفك التشفير</button>
                <button className="menu-item" onClick={() => { setShareFile(menu.item as XFile); setMenu(null); }}><Share2 size={15} /> مشاركة برابط منتهٍ</button>
                <div className="my-1 border-t border-white/5" />
                <button className="menu-item" onClick={() => startRename("file", menu.item)}><Pencil size={15} /> إعادة تسمية</button>
                <button className="menu-item" onClick={() => { setMoveFiles([menu.item as XFile]); setMenu(null); }}><FolderInput size={15} /> نقل إلى…</button>
                <button className="menu-item" onClick={() => { toggleFavorite(menu.item as XFile); setMenu(null); }}>
                  <Star size={15} /> {(menu.item as XFile).isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
                </button>
                <div className="my-1 border-t border-white/5" />
                <button className="menu-item danger" onClick={() => { setDeleteTarget({ kind: "file", id: menu.item.id, name: (menu.item as XFile).fileName }); setMenu(null); }}>
                  <Trash2 size={15} /> نقل إلى السلة
                </button>
              </>
            ) : (
              <>
                <button className="menu-item" onClick={() => { openFolder(menu.item.id); setMenu(null); }}><Folder size={15} /> فتح</button>
                <button className="menu-item" onClick={() => startRename("folder", menu.item)}><Pencil size={15} /> إعادة تسمية</button>
                <div className="my-1 border-t border-white/5" />
                <button className="menu-item danger" onClick={() => { setDeleteTarget({ kind: "folder", id: menu.item.id, name: (menu.item as XFolder).name }); setMenu(null); }}>
                  <Trash2 size={15} /> نقل إلى السلة
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ═══ النوافذ المنبثقة ═══ */}
      {/* مجلد جديد */}
      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="مجلد جديد"
        footer={
          <>
            <button className="btn-ghost text-sm" onClick={() => setNewFolderOpen(false)}>إلغاء</button>
            <button className="btn-primary text-sm" onClick={createFolder}><FolderPlus size={16} /> إنشاء</button>
          </>
        }
      >
        <label className="text-xs text-[#aab3d9] mb-1.5 block" htmlFor="new-folder">اسم المجلد</label>
        <input
          id="new-folder"
          autoFocus
          className="input"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createFolder()}
          placeholder="مثال: صور العائلة 2026"
        />
      </Modal>

      {/* إعادة تسمية */}
      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="إعادة تسمية"
        footer={
          <>
            <button className="btn-ghost text-sm" onClick={() => setRenameTarget(null)}>إلغاء</button>
            <button className="btn-primary text-sm" onClick={doRename}><Check size={16} /> حفظ</button>
          </>
        }
      >
        <input
          autoFocus
          className="input"
          value={renameTarget?.value ?? ""}
          onChange={(e) => setRenameTarget((t) => (t ? { ...t, value: e.target.value } : t))}
          onKeyDown={(e) => e.key === "Enter" && doRename()}
          aria-label="الاسم الجديد"
        />
      </Modal>

      {/* تأكيد الحذف */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="نقل إلى السلة"
        message={`سيتم نقل «${deleteTarget?.name}» إلى سلة المحذوفات. يمكنك استعادته خلال 30 يوماً قبل الحذف النهائي.`}
        confirmLabel="نقل إلى السلة"
        danger
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "file") void deleteFile(deleteTarget.id);
          else void deleteFolder(deleteTarget.id);
        }}
      />
      <ConfirmDialog
        open={deleteBulk}
        onClose={() => setDeleteBulk(false)}
        title="حذف جماعي"
        message={`سيتم نقل ${selected.size} ملفاً إلى السلة.`}
        confirmLabel="نقل الكل إلى السلة"
        danger
        onConfirm={bulkDelete}
      />

      {/* النقل */}
      {moveFiles && <MoveModal files={moveFiles} currentFolderId={folderId} onClose={() => setMoveFiles(null)} onDone={() => { setMoveFiles(null); setSelected(new Set()); reload(); }} />}

      {/* المشاركة */}
      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}

      {/* المعاينة */}
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} onDownload={downloadFile} onShare={(f) => { setPreviewFile(null); setShareFile(f); }} />}
    </div>
  );
}

/** ═══ نافذة نقل الملفات ═══ */
function MoveModal({ files, currentFolderId, onClose, onDone }: { files: XFile[]; currentFolderId: string | null; onClose: () => void; onDone: () => void }) {
  const [folders, setFolders] = useState<{ id: string; name: string; parentId: string | null }[]>([]);
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.json())
      .then((d) => setFolders(d.folders ?? []));
  }, []);

  const flat = useMemo(() => {
    const result: { id: string; name: string; depth: number }[] = [];
    const children = new Map<string | null, typeof folders>();
    for (const f of folders) {
      const list = children.get(f.parentId) ?? [];
      list.push(f);
      children.set(f.parentId, list);
    }
    const walk = (parentId: string | null, depth: number) => {
      for (const f of children.get(parentId) ?? []) {
        result.push({ id: f.id, name: f.name, depth });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  }, [folders]);

  const doMove = async () => {
    if (target === undefined) return;
    setBusy(true);
    try {
      for (const file of files) {
        await fetch(`/api/files/${file.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: target }),
        });
      }
      toast.success(files.length > 1 ? `نُقل ${files.length} ملفات` : "تم نقل الملف");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`نقل ${files.length > 1 ? `${files.length} ملفات` : "ملف"} إلى…`}
      footer={
        <>
          <button className="btn-ghost text-sm" onClick={onClose}>إلغاء</button>
          <button className="btn-primary text-sm" disabled={target === undefined || busy} onClick={doMove}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <FolderInput size={15} />} نقل هنا
          </button>
        </>
      }
    >
      <div className="max-h-80 overflow-y-auto -mx-1">
        <button
          onClick={() => setTarget(null)}
          className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors", target === null ? "bg-cyan-400/15 text-cyan-200" : "hover:bg-white/5 text-[#cdd3ee]")}
        >
          <Home size={17} className="text-[#8b93b8]" /> المجلد الرئيسي (الجذر)
          {target === null && <Check size={15} className="mr-auto text-cyan-300" />}
        </button>
        {flat.map((f) => (
          <button
            key={f.id}
            onClick={() => setTarget(f.id)}
            disabled={f.id === currentFolderId}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-35",
              target === f.id ? "bg-cyan-400/15 text-cyan-200" : "hover:bg-white/5 text-[#cdd3ee]"
            )}
            style={{ paddingRight: `${12 + f.depth * 22}px` }}
          >
            <Folder size={17} className="text-amber-300/90" /> <span className="truncate">{f.name}</span>
            {target === f.id && <Check size={15} className="mr-auto text-cyan-300 shrink-0" />}
          </button>
        ))}
        {flat.length === 0 && <p className="text-xs text-[#59617f] text-center py-6">لا توجد مجلدات — أنشئ مجلداً أولاً من الزر أعلاه</p>}
      </div>
    </Modal>
  );
}

/** ═══ نافذة المشاركة — المفتاح في #fragment ولا يصل الخادم ═══ */
function ShareModal({ file, onClose }: { file: XFile; onClose: () => void }) {
  const [ttl, setTtl] = useState(24);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    const rawKey = getRawVaultKey();
    if (!rawKey) {
      toast.error("افتح الخزنة أولاً (أعد تحميل الصفحة أو أدخل كلمة المرور)");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, expiresInHours: ttl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const fragmentKey = rawKey.replace(/\+/g, "-").replace(/\//g, "_");
      setLink(`${window.location.origin}/share/${data.token}#k=${fragmentKey}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إنشاء الرابط");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Modal open onClose={onClose} title="مشاركة آمنة برابط منتهٍ">
      {!link ? (
        <div className="space-y-4">
          <p className="text-[13px] text-[#aab3d9] leading-7">
            سيُولَّد رابط يحمل <span className="text-white font-semibold">مفتاح الفك في جزئه السري</span> (#fragment) — لن يصل المفتاح إلى خوادمنا إطلاقاً. أي شخص يملك الرابط يستطيع فك تشفير «{file.fileName}» حتى انتهاء صلاحيته.
          </p>
          <div>
            <label className="text-xs text-[#aab3d9] mb-1.5 block">مدة صلاحية الرابط</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { h: 1, label: "ساعة واحدة" },
                { h: 24, label: "24 ساعة" },
                { h: 168, label: "7 أيام" },
              ].map(({ h, label }) => (
                <button
                  key={h}
                  onClick={() => setTtl(h)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-xs font-semibold transition-all",
                    ttl === h ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : "border-[var(--panel-border)] text-[#aab3d9] hover:border-white/20"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full justify-center" onClick={create} disabled={busy}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Link2 size={17} />} إنشاء رابط المشاركة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
            <CheckCircle2 size={18} /> الرابط جاهز — صالح حتى {ttl === 168 ? "7 أيام" : ttl === 24 ? "24 ساعة" : "ساعة واحدة"}
          </div>
          <div className="flex items-stretch gap-2" dir="ltr">
            <input readOnly value={link} className="input font-mono2 !text-[10px] flex-1" onFocus={(e) => e.target.select()} aria-label="رابط المشاركة" />
            <button onClick={copy} className="btn-ghost !px-3" aria-label="نسخ">
              {copied ? <Check size={17} className="text-emerald-400" /> : <Copy size={17} />}
            </button>
            <a href={link} target="_blank" rel="noreferrer" className="btn-ghost !px-3" aria-label="فتح">
              <ExternalLink size={17} />
            </a>
          </div>
          <p className="text-[10px] text-amber-300/90 bg-amber-400/5 border border-amber-400/20 rounded-xl px-3 py-2.5 leading-6">
            الرابط يعادل مفتاح الملف: من يملكه يملك المحتوى. لا تنشره في قنوات عامة — أرسله للمستلم مباشرة.
          </p>
          <button className="btn-ghost w-full justify-center text-sm" onClick={onClose}>إغلاق</button>
        </div>
      )}
    </Modal>
  );
}

/** ═══ نافذة المعاينة — فك التشفير كامل داخل المتصفح ═══ */
function PreviewModal({
  file,
  onClose,
  onDownload,
  onShare,
}: {
  file: XFile;
  onClose: () => void;
  onDownload: (f: XFile) => void;
  onShare: (f: XFile) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const metaRes = await fetch(`/api/files/${file.id}/url`);
        if (!metaRes.ok) throw new Error("تعذر تجهيز الرابط");
        const meta = await metaRes.json();
        const key = await ensureVaultKey();
        if (!key) throw new Error("ألغيت فتح الخزنة");
        const buf = await (await fetch(meta.url)).arrayBuffer();
        const blob = await decryptWholeFile(key, buf, meta.file.fileSizeBytes, meta.file.chunkCount);
        objectUrl = URL.createObjectURL(new Blob([blob], { type: file.mimeType }));
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذر فتح الملف");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const category = fileCategory(file.mimeType);
  const Icon = MIME_ICON(file.mimeType);

  return (
    <Modal
      open
      onClose={onClose}
      title={file.fileName}
      wide
      footer={
        <>
          <span className="mr-auto text-[10px] text-[#59617f] flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400" /> فُكّ تشفيره محلياً</span>
          <button className="btn-ghost text-sm" onClick={() => onShare(file)}><Share2 size={15} /> مشاركة</button>
          <button className="btn-primary text-sm" onClick={() => onDownload(file)}><Download size={15} /> تنزيل</button>
        </>
      }
    >
      <div className="min-h-56 flex items-center justify-center">
        {busy ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <Spinner className="h-8 w-8" />
            <p className="text-xs text-[#8b93b8]">جارٍ جلب الأجزاء وفك تشفيرها…</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-rose-300">{error}</p>
            <button className="btn-ghost text-xs mt-4" onClick={() => onDownload(file)}>تنزيل كبديل</button>
          </div>
        ) : blobUrl && category === "image" ? (
          <img src={blobUrl} alt={file.fileName} className="max-h-[62vh] rounded-xl mx-auto" />
        ) : blobUrl && category === "video" ? (
          <video src={blobUrl} controls autoPlay playsInline className="max-h-[62vh] w-full rounded-xl bg-black" />
        ) : blobUrl && category === "audio" ? (
          <div className="py-10 flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-pink-400/10 flex items-center justify-center"><FileAudio size={36} className="text-pink-300" /></div>
            <audio src={blobUrl} controls className="w-72" />
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center gap-4 text-center">
            <div className={cn("h-20 w-20 rounded-2xl flex items-center justify-center", MIME_COLOR(file.mimeType))}><Icon size={36} /></div>
            <p className="text-sm text-[#aab3d9]">{formatDate(file.createdAt)} · {formatBytes(file.fileSizeBytes)}</p>
            <button className="btn-primary" onClick={() => onDownload(file)}><Download size={17} /> تنزيل وفك التشفير</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
