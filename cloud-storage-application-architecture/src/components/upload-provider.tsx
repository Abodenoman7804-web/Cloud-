"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Ban,
  CloudUpload,
  Loader2,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { CHUNK_SIZE, b64ToBytes, bytesToB64, chunkCountFor, encryptChunk, makeThumbnail } from "@/lib/crypto-client";
import { ensureVaultKey } from "@/lib/vault";
import { cn, formatBytes, formatSpeed } from "@/lib/utils";

export type UploadTask = {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  progress: number; // 0-100
  speedBps: number;
  status: "uploading" | "done" | "error" | "canceled";
  error?: string;
};

type UploadContextType = {
  tasks: UploadTask[];
  enqueue: (files: File[], folderId: string | null) => void;
  cancelTask: (id: string) => void;
  dismissTask: (id: string) => void;
  clearFinished: () => void;
  uploading: boolean;
};

const UploadContext = createContext<UploadContextType | null>(null);
export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
}

const CONCURRENCY = 4; // 4 خيوط رفع متوازية — كما في معمارية الرفع المجزأ
const MAX_RETRIES = 3;

export function UploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const abortRefs = useRef(new Map<string, AbortController>());

  const patchTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const cancelTask = useCallback((id: string) => {
    abortRefs.current.get(id)?.abort();
  }, []);

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status === "uploading"));
  }, []);

  const runUpload = useCallback(
    async (file: File, folderId: string | null, taskId: string) => {
      const controller = new AbortController();
      abortRefs.current.set(taskId, controller);
      const startedAt = Date.now();
      let uploadedBytes = 0;

      // اشتقاق مفتاح الخزنة مبكراً — يُستخدم للبصمة المصغرة وللتشفير
      const vaultKey = await ensureVaultKey();
      if (!vaultKey) {
        patchTask(taskId, { status: "error", error: "يلزم فتح الخزنة (كلمة المرور) لرفع الملفات مشفرة", speedBps: 0 });
        return;
      }

      const bumpProgress = (delta: number) => {
        uploadedBytes += delta;
        const elapsed = Math.max(0.4, (Date.now() - startedAt) / 1000);
        const progress = Math.min(99, (uploadedBytes / file.size) * 100);
        patchTask(taskId, { progress, speedBps: uploadedBytes / elapsed });
      };

      const abortSession = async (sessionId: string | null) => {
        if (!sessionId) return;
        try {
          await fetch(`/api/uploads/${sessionId}/abort`, { method: "POST" });
        } catch {
          /* ignore */
        }
      };

      let sessionId: string | null = null;
      try {
        // 1) البصمة المصغرة — تُشفَّر بالكامل قبل مغادرتها الجهاز
        const rawThumb = await makeThumbnail(file);
        const thumbnail = rawThumb
          ? bytesToB64(await encryptChunk(vaultKey, b64ToBytes(rawThumb)))
          : undefined;

        // 2) طلب بدء جلسة رفع — الخادم يحجز المساحة ذرّياً
        const initRes = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSizeBytes: file.size,
            totalChunks: chunkCountFor(file.size),
            folderId,
            thumbnail,
          }),
        });
        const initData = await initRes.json().catch(() => ({}));
        if (!initRes.ok) {
          throw new Error(initData.error || "تعذر بدء جلسة الرفع");
        }
        sessionId = initData.sessionId as string;

        // 3) مفتاح الخزنة — تشفير من طرف لآخر
        const key = await ensureVaultKey();
        if (!key) throw new Error("يلزم فتح الخزنة (كلمة المرور) لرفع الملفات مشفرة");
        if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");

        // 4) تشفير الأجزاء ورفعها بأربعة خيوط متوازية
        const total = chunkCountFor(file.size);
        const queue = Array.from({ length: total }, (_, i) => i);

        const uploadPart = async (index: number) => {
          const start = index * CHUNK_SIZE;
          const slice = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
          const plainBuffer = await slice.arrayBuffer();
          const encrypted = await encryptChunk(key, new Uint8Array(plainBuffer));

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");
            try {
              const signRes = await fetch(`/api/uploads/${sessionId}/sign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ part: index + 1 }),
                signal: controller.signal,
              });
              if (!signRes.ok) throw new Error("تعذر توقيع الجزء");
              const { url } = await signRes.json();

              const putRes = await fetch(url, {
                method: "PUT",
                body: encrypted.buffer as ArrayBuffer,
                headers: { "Content-Type": "application/octet-stream" },
                signal: controller.signal,
              });
              if (!putRes.ok) throw new Error(`فشل رفع الجزء ${index + 1}`);
              bumpProgress(plainBuffer.byteLength);
              return;
            } catch (err) {
              if (controller.signal.aborted) throw err;
              if (attempt === MAX_RETRIES) throw err;
              await new Promise((r) => setTimeout(r, 400 * attempt * attempt));
            }
          }
        };

        const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
          while (queue.length && !controller.signal.aborted) {
            const index = queue.shift();
            if (index === undefined) break;
            await uploadPart(index);
          }
        });
        await Promise.all(workers);
        if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");

        // 5) إشعار الخادم بإتمام الرفع
        const completeRes = await fetch(`/api/uploads/${sessionId}/complete`, { method: "POST" });
        if (!completeRes.ok) {
          const data = await completeRes.json().catch(() => ({}));
          throw new Error(data.error || "تعذر إتمام الرفع");
        }

        patchTask(taskId, { progress: 100, status: "done", speedBps: 0 });
        toast.success(`تم رفع «${file.name}» مشفراً`);
        window.dispatchEvent(new CustomEvent("sahaab:files-changed"));
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        await abortSession(sessionId);
        if (isAbort) {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          toast.message(`تم إلغاء رفع «${file.name}» واسترداد المساحة`);
        } else {
          const message = err instanceof Error ? err.message : "حدث خطأ أثناء الرفع";
          patchTask(taskId, { status: "error", error: message, speedBps: 0 });
          toast.error(message);
          window.dispatchEvent(new CustomEvent("sahaab:files-changed"));
        }
      } finally {
        abortRefs.current.delete(taskId);
      }
    },
    [patchTask]
  );

  const enqueue = useCallback(
    (files: File[], folderId: string | null) => {
      for (const file of files) {
        const taskId = crypto.randomUUID();
        setTasks((prev) => [
          {
            id: taskId,
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type,
            progress: 0,
            speedBps: 0,
            status: "uploading",
          },
          ...prev,
        ]);
        void runUpload(file, folderId, taskId);
      }
    },
    [runUpload]
  );

  const uploading = tasks.some((t) => t.status === "uploading");

  const value = useMemo(
    () => ({ tasks, enqueue, cancelTask, dismissTask, clearFinished, uploading }),
    [tasks, enqueue, cancelTask, dismissTask, clearFinished, uploading]
  );

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadPanel />
    </UploadContext.Provider>
  );
}

/** لوحة تقدم الرفع الثابتة */
function UploadPanel() {
  const { tasks, cancelTask, dismissTask, clearFinished } = useUpload();
  if (tasks.length === 0) return null;

  const active = tasks.filter((t) => t.status === "uploading").length;

  return (
    <div className="fixed bottom-5 left-5 z-40 w-[min(92vw,380px)]" dir="rtl">
      <div className="glass rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--panel-border)] bg-white/[0.02]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {active > 0 ? (
              <>
                <Loader2 size={16} className="animate-spin text-cyan-300" />
                جارٍ رفع {active} {active > 1 ? "ملفات" : "ملف"}…
              </>
            ) : (
              <>
                <CloudUpload size={16} className="text-emerald-400" />
                اكتملت عمليات الرفع
              </>
            )}
          </div>
          <button
            onClick={clearFinished}
            className="text-[11px] text-[#8b93b8] hover:text-white flex items-center gap-1 transition-colors"
          >
            <Eraser size={12} /> مسح المنجز
          </button>
        </div>
        <ul className="max-h-64 overflow-y-auto divide-y divide-white/5">
          {tasks.map((task) => (
            <li key={task.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      task.status === "done" && "bg-emerald-500/15 text-emerald-400",
                      task.status === "error" && "bg-rose-500/15 text-rose-400",
                      task.status === "uploading" && "bg-cyan-500/15 text-cyan-300",
                      task.status === "canceled" && "bg-slate-500/15 text-slate-400"
                    )}
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 size={18} />
                    ) : task.status === "error" ? (
                      <AlertCircle size={18} />
                    ) : (
                      <Upload size={17} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate text-[#e8ecf8]" title={task.name}>
                      {task.name}
                    </p>
                    <p className="text-[10px] text-[#8b93b8] mt-0.5">
                      {task.status === "error"
                        ? task.error
                        : task.status === "done"
                        ? formatBytes(task.sizeBytes)
                        : `${formatBytes(task.sizeBytes)} · ${formatSpeed(task.speedBps)}`}
                    </p>
                  </div>
                </div>
                {task.status === "uploading" ? (
                  <button
                    onClick={() => cancelTask(task.id)}
                    className="p-1.5 rounded-lg text-[#8b93b8] hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    aria-label="إلغاء"
                  >
                    <Ban size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => dismissTask(task.id)}
                    className="p-1.5 rounded-lg text-[#8b93b8] hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="إزالة"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              {task.status === "uploading" && (
                <div className="mt-2 flex items-center gap-2" dir="ltr">
                  <div className="progress-track h-1.5 flex-1">
                    <div className="progress-fill h-full" style={{ width: `${task.progress}%` }} />
                  </div>
                  <span className="text-[10px] font-mono2 text-cyan-200/90 w-9 text-right">{Math.floor(task.progress)}%</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
