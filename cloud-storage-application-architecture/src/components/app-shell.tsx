"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Star,
  Trash2,
  Settings,
  Cloud,
  Search,
  Upload,
  Lock,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";
import { PageLoader } from "@/components/ui";
import PinLock from "@/components/pin-lock";
import { UploadProvider, useUpload } from "@/components/upload-provider";
import { resolveVaultRequest } from "@/lib/vault";
import { deriveVaultKey, exportRawVaultKey } from "@/lib/crypto-client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  encryptionSalt: string;
  pinSet: boolean;
  storageLimitBytes: number;
  storageUsedBytes: number;
  createdAt: string;
};

const NAV = [
  { href: "/app", label: "لوحة المعلومات", icon: LayoutDashboard },
  { href: "/app/files", label: "ملفاتي", icon: FolderOpen },
  { href: "/app/favorites", label: "المفضلة", icon: Star },
  { href: "/app/trash", label: "سلة المحذوفات", icon: Trash2 },
  { href: "/app/settings", label: "الإعدادات والأمان", icon: Settings },
];

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <UploadProvider>
      <ShellInner>{children}</ShellInner>
    </UploadProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { enqueue } = useUpload();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<{ usedBytes: number; limitBytes: number; percent: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.storage);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setUnlocked(sessionStorage.getItem("sahaab.unlocked") === "1");
      } finally {
        setLoading(false);
      }
      refreshStats();
    })();
    const onChanged = () => refreshStats();
    window.addEventListener("sahaab:files-changed", onChanged);
    return () => window.removeEventListener("sahaab:files-changed", onChanged);
  }, [router, refreshStats]);

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("sahaab.unlocked");
    sessionStorage.removeItem("sahaab.vault");
    router.replace("/login");
  }, [router]);

  const lockApp = useCallback(() => {
    sessionStorage.removeItem("sahaab.unlocked");
    setUnlocked(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <PageLoader label="جارٍ فتح خزنتك السحابية…" />
      </div>
    );
  }
  if (!user) return null;

  const needsPin = user.pinSet && !unlocked;

  return (
    <div className="min-h-screen app-bg text-[#e8ecf8]">
      {/* ═══ القائمة الجانبية ═══ */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-30 h-full w-72 flex flex-col border-l border-[var(--panel-border)] bg-[#090d1c]/92 backdrop-blur-2xl transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* الشعار */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--panel-border)]">
          <Link href="/app" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center">
                <Cloud size={19} className="text-white fill-white/20" strokeWidth={2} />
              </div>
            </div>
            <div className="leading-tight">
              <p className="font-display font-extrabold text-lg tracking-tight">سحاب</p>
              <p className="text-[9px] font-mono2 text-[#59617f] tracking-[0.18em]">SAHAAB · 1TB</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-[#8b93b8]" aria-label="إغلاق القائمة">
            <X size={20} />
          </button>
        </div>

        {/* التنقل */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] font-semibold tracking-[0.2em] text-[#59617f] mb-2">القائمة</p>
          {NAV.map((item) => {
            const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 border border-transparent",
                  active
                    ? "bg-gradient-to-l from-cyan-400/15 to-violet-500/15 text-cyan-200 border-cyan-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-[#aab3d9] hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Icon size={18} strokeWidth={1.8} className={active ? "text-cyan-300" : "text-[#8b93b8]"} />
                <span className="font-medium">{item.label}</span>
                {active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />}
              </Link>
            );
          })}

          {/* عداد المساحة */}
          <div className="mt-6 mx-1 rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-[#11172b] to-[#0b1020] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-[#59617f]">سعتك</span>
              <span className="chip !py-0.5 !text-[10px] !text-cyan-200 !border-cyan-400/25 !bg-cyan-400/5">
                <Sparkles size={11} /> خطة 1TB
              </span>
            </div>
            <p className="font-display font-bold text-lg leading-none">
              {stats ? formatBytes(stats.usedBytes) : "…"}
              <span className="text-[11px] text-[#8b93b8] font-sans font-normal"> / 1 TB</span>
            </p>
            <div className="progress-track h-2 mt-2.5" dir="ltr">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-700"
                style={{ width: `${Math.max(1.5, stats?.percent ?? 0)}%` }}
              />
            </div>
            <Link href="/app/settings" className="mt-3 block text-center text-[11px] text-cyan-300 hover:text-cyan-200 transition-colors">
              إدارة خطتك ←
            </Link>
          </div>
        </nav>

        {/* المستخدم */}
        <div className="p-3 border-t border-[var(--panel-border)]">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.03]">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center font-display font-bold text-white shrink-0">
              {user.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-[#59617f] truncate" dir="ltr">{user.email}</p>
            </div>
            <button onClick={logout} className="p-2 rounded-lg text-[#8b93b8] hover:text-rose-300 hover:bg-rose-500/10 transition-colors" aria-label="تسجيل الخروج" title="تسجيل الخروج">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* الغطاء للجوال */}
      {sidebarOpen && (
        <button className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="إغلاق" />
      )}

      {/* ═══ المحتوى ═══ */}
      <div className="lg:pr-72">
        {/* الشريط العلوي */}
        <header className="sticky top-0 z-10 h-16 flex items-center gap-2 px-4 sm:px-6 border-b border-[var(--panel-border)] bg-[#05070f]/75 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -mr-2 text-[#aab3d9]" aria-label="القائمة">
            <Menu size={22} />
          </button>

          {/* بحث */}
          <form
            className="relative flex-1 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(`/app/files${q ? `?q=${encodeURIComponent(String(q))}` : ""}`);
            }}
          >
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#59617f] pointer-events-none" />
            <input
              name="q"
              placeholder="ابحث في ملفاتك…"
              className="input !py-2.5 !pr-10 !text-sm"
              aria-label="بحث"
            />
          </form>

          <div className="mr-auto flex items-center gap-1.5 sm:gap-2">
            <span className="hidden md:flex chip !text-[10px] !text-emerald-300 !border-emerald-400/25 !bg-emerald-400/5">
              <ShieldCheck size={11} /> E2EE مفعّل
            </span>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) enqueue(files, null);
                e.target.value = "";
              }}
            />
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary !py-2 !px-3 sm:!px-4 !text-xs sm:text-sm">
              <Upload size={16} />
              <span className="hidden sm:inline">رفع ملفات</span>
            </button>

            {user.pinSet && (
              <button onClick={lockApp} className="p-2.5 rounded-xl border border-[var(--panel-border)] text-[#aab3d9] hover:text-white hover:bg-white/5 transition-colors" title="قفل التطبيق" aria-label="قفل التطبيق">
                <Lock size={17} />
              </button>
            )}

            {/* قائمة الحساب */}
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-white/5 transition-colors" aria-label="قائمة الحساب">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-xs font-bold">
                  {user.name.trim().charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={14} className="hidden sm:block text-[#8b93b8]" />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-full mt-2 w-52 glass rounded-xl p-1.5 z-20 fade-up">
                  <Link href="/app/settings" className="menu-item">
                    <Settings size={15} /> الإعدادات والأمان
                  </Link>
                  <button className="menu-item" onClick={lockApp} disabled={!user.pinSet}>
                    <Lock size={15} /> قفل التطبيق
                  </button>
                  <div className="my-1.5 border-t border-white/5" />
                  <button className="menu-item danger" onClick={logout}>
                    <LogOut size={15} /> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* المحتوى الرئيسي */}
        <main className="px-4 sm:px-6 py-6 max-w-[1500px] mx-auto">{children}</main>
      </div>

      {/* بوابة PIN */}
      {needsPin && <PinLock userId={user.id} userName={user.name} onUnlock={() => setUnlocked(true)} />}

      {/* نافذة فتح الخزنة — تُستدعى عند الحاجة لكلمة المرور */}
      <VaultModal salt={user.encryptionSalt} />
    </div>
  );
}

/** نافذة اشتقاق مفتاح التشفير من كلمة المرور (Zero-Knowledge) */
function VaultModal({ salt }: { salt: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onRequest = () => {
      setOpen(true);
      setError(null);
      setPassword("");
    };
    window.addEventListener("sahaab:vault-request", onRequest);
    return () => window.removeEventListener("sahaab:vault-request", onRequest);
  }, []);

  const close = useCallback(
    (cancelled: boolean) => {
      setOpen(false);
      if (cancelled) void resolveVaultRequest(null);
    },
    []
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password || busy) return;
      setBusy(true);
      setError(null);
      try {
        const key = await deriveVaultKey(password, salt);
        const raw = await exportRawVaultKey(key);
        setOpen(false);
        await resolveVaultRequest(raw);
        toast.success("تم فتح الخزنة — الملفات تُفك محلياً فقط");
      } catch {
        setError("تعذر اشتقاق المفتاح — حاول مرة أخرى");
      } finally {
        setBusy(false);
      }
    },
    [busy, password, salt]
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => close(true)} aria-label="إلغاء" />
      <form onSubmit={submit} className="relative glass rounded-2xl w-full max-w-md p-6 fade-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-violet-400/25 flex items-center justify-center">
            <KeyRound size={22} className="text-violet-300" />
          </div>
          <div>
            <h2 className="font-display font-bold">فتح الخزنة المشفّرة</h2>
            <p className="text-[11px] text-[#8b93b8] mt-0.5">ملفاتك تُفك محلياً بكلمة مرورك — لا يطلبها الخادم أبداً</p>
          </div>
        </div>
        <label className="text-xs text-[#aab3d9] mb-1.5 block" htmlFor="vault-password">كلمة المرور</label>
        <div className="relative">
          <input
            id="vault-password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pl-11"
            placeholder="••••••••"
            autoFocus
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617f] hover:text-white" aria-label={show ? "إخفاء" : "إظهار"}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" className="btn-ghost text-sm" onClick={() => close(true)}>إلغاء</button>
          <button type="submit" className="btn-primary text-sm" disabled={busy || !password}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            فتح الخزنة
          </button>
        </div>
      </form>
    </div>
  );
}
