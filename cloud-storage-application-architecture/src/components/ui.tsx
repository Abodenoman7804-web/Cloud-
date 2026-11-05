"use client";

import { useEffect, type ReactNode } from "react";
import { X, type LucideIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-cyan-300", className)} size={22} />;
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 flex items-center justify-center">
          <Spinner className="h-7 w-7" />
        </div>
      </div>
      {label && <p className="text-sm text-[#8b93b8]">{label}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="relative">
        <div className="absolute inset-0 blur-2xl bg-gradient-to-br from-cyan-400/25 to-violet-500/25 rounded-full" />
        <div className="relative h-20 w-20 rounded-3xl border border-[var(--panel-border)] bg-[#11172b] flex items-center justify-center">
          <Icon size={34} className="text-cyan-200/80" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="font-display font-bold text-lg text-[#e8ecf8]">{title}</h3>
      {hint && <p className="text-sm text-[#8b93b8] max-w-sm leading-6">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="إغلاق" className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default" onClick={onClose} />
      <div
        className={cn(
          "relative glass rounded-2xl w-full max-h-[88vh] flex flex-col fade-up",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--panel-border)]">
          <h2 className="font-display font-bold text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[#8b93b8] hover:text-white transition-colors" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[var(--panel-border)] flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "تأكيد",
  danger,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn-ghost text-sm" onClick={onClose}>إلغاء</button>
          <button
            className={cn(
              "text-sm font-semibold px-4 py-2.5 rounded-xl transition-all",
              danger
                ? "bg-rose-500/90 hover:bg-rose-500 text-white"
                : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
            )}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-[#aab3d9] leading-7">{message}</p>
    </Modal>
  );
}
