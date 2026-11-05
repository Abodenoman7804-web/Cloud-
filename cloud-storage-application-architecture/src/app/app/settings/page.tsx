"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Mail,
  Calendar,
  Lock,
  KeyRound,
  Fingerprint,
  Loader2,
  HardDrive,
  Sparkles,
  Trash2,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  BadgeCheck,
  MailQuestion,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { Modal, ConfirmDialog } from "@/components/ui";
import { sha256Hex } from "@/lib/crypto-client";
import { enrollBiometric, hasEnrolledBiometric, isBiometricAvailable, removeBiometric } from "@/lib/biometric";
import { clearVault } from "@/lib/vault";
import type { SessionUser } from "@/components/app-shell";

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<{ usedBytes: number; limitBytes: number; percent: number } | null>(null);

  const load = useCallback(async () => {
    const [meRes, statsRes] = await Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }),
      fetch("/api/stats", { cache: "no-store" }),
    ]);
    if (meRes.ok) setMe((await meRes.json()).user);
    if (statsRes.ok) setStats((await statsRes.json()).storage);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!me) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-cyan-300" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-up">
      <header>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl">الإعدادات <span className="gradient-text">والأمان</span></h1>
        <p className="text-xs text-[#8b93b8] mt-1.5">تحكم في هويتك، رمزك السري، وخزنتك المشفرة — كل شيء في مكان واحد.</p>
      </header>

      {/* ═══ الحساب ═══ */}
      <section className="glass rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-700 flex items-center justify-center font-display font-extrabold text-3xl text-white shrink-0 shadow-lg shadow-violet-900/40">
          {me.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-xl truncate">{me.name}</p>
          <p className="text-sm text-[#8b93b8] flex items-center gap-1.5 mt-1 truncate" dir="ltr"><Mail size={13} /> {me.email}</p>
          <p className="text-[11px] text-[#59617f] flex items-center gap-1.5 mt-1"><Calendar size={12} /> عضو منذ {formatDate(me.createdAt)}</p>
        </div>
        <span className="chip !text-cyan-200 !border-cyan-400/25 !bg-cyan-400/5 self-start sm:self-auto"><Sparkles size={12} /> خطة 1TB مجانية</span>
      </section>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ═══ كلمة المرور ═══ */}
        <PasswordCard />

        {/* ═══ رمز PIN + البيومترية ═══ */}
        <PinCard pinSet={me.pinSet} userId={me.id} onChanged={load} />
      </div>

      {/* ═══ خزنة التشفير ═══ */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-400/25 flex items-center justify-center shrink-0">
            <ShieldCheck size={26} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold">خزنة التشفير (AES-256-GCM)</h2>
            <p className="text-[12px] text-[#8b93b8] leading-6 mt-1">
              مفتاحك مشتق محلياً من كلمة مرورك عبر PBKDF2 (100 ألف تكرار) ولا يغادر جهازك. الملفات والأصغرات (Thumbnails) كلها مشفرة — الخادم يرى كتل بايت عشوائية فقط.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              className="btn-ghost !text-xs"
              onClick={() => window.dispatchEvent(new CustomEvent("sahaab:vault-request"))}
            >
              <KeyRound size={14} /> فتح الخزنة الآن
            </button>
            <button
              className="text-[11px] text-[#59617f] hover:text-rose-300 transition-colors"
              onClick={() => {
                clearVault();
                toast.success("مُسح مفتاح الخزنة من هذا الجهاز — ستُطلب كلمة المرور عند الحاجة");
              }}
            >
              مسح المفتاح من هذا الجهاز
            </button>
          </div>
        </div>
      </section>

      {/* ═══ خطتي ═══ */}
      <section id="plan" className="glass rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/15 border border-cyan-400/25 flex items-center justify-center shrink-0">
            <HardDrive size={26} className="text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display font-bold">سحاب — الخطة الشخصية</h2>
              <span className="font-mono2 text-[11px] text-cyan-200">{stats ? formatBytes(stats.usedBytes) : "…"} / 1 TB</span>
            </div>
            <div className="progress-track h-2.5 mt-3" dir="ltr">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all" style={{ width: `${Math.max(1.5, stats?.percent ?? 0)}%` }} />
            </div>
            <p className="text-[10px] text-[#59617f] mt-2">الحد الأقصى 1,099,511,627,776 بايت — يُفرض ذرّياً في قاعدة البيانات ومستحيل تجاوزه.</p>
          </div>
          <a href="mailto:family@sahaab.app?subject=خطة سحاب العائلية 5TB" className="btn-ghost !text-xs shrink-0">
            <MailQuestion size={14} /> خطة العائلة 5TB — راسلنا
          </a>
        </div>
      </section>

      {/* ═══ منطقة الخطر ═══ */}
      <DangerZone email={me.email} />
    </div>
  );
}

/** ═══ تغيير كلمة المرور ═══ */
function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("كلمة المرور الجديدة قصيرة جداً");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "تعذر تغيير كلمة المرور");
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrent("");
      setNext("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="font-display font-bold flex items-center gap-2"><Lock size={18} className="text-violet-300" /> كلمة المرور</h2>
      <p className="text-[11px] text-amber-300/80 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2 mt-3 leading-6">
        تنبيه: تغيير كلمة المرور لا يعيد اشتقاق مفتاح الخزنة تلقائياً — انتظر دعم «إعادة التشفير» القادم، فملفاتك مرتبطة بالمفتاح القديم.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input type="password" className="input" placeholder="كلمة المرور الحالية" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" aria-label="كلمة المرور الحالية" />
        <div className="relative">
          <input type={show ? "text" : "password"} className="input !pl-11" placeholder="كلمة المرور الجديدة (8+)" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" aria-label="كلمة المرور الجديدة" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617f] hover:text-white" aria-label={show ? "إخفاء" : "إظهار"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full justify-center !text-sm">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={15} />} تحديث كلمة المرور
        </button>
      </form>
    </section>
  );
}

/** ═══ رمز PIN والبيومترية ═══ */
function PinCard({ pinSet, userId, onChanged }: { pinSet: boolean; userId: string; onChanged: () => void }) {
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      setBioSupported(await isBiometricAvailable());
      setBioEnrolled(hasEnrolledBiometric(userId));
    })();
  }, [userId]);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) return toast.error("رمز PIN يجب أن يكون 4–6 أرقام");
    if (pin !== confirm) return toast.error("تأكيد الرمز غير مطابق");
    setBusy(true);
    try {
      const pinHash = await sha256Hex(pin);
      const payload: Record<string, string> = { action: "setup", pinHash };
      if (pinSet) {
        if (!/^\d{4,6}$/.test(currentPin)) return toast.error("أدخل رمز PIN الحالي");
        payload.currentPinHash = await sha256Hex(currentPin);
      }
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "تعذر حفظ الرمز");
      toast.success(pinSet ? "تم تغيير رمز PIN" : "تم تفعيل رمز PIN لحماية دخولك");
      setSetupOpen(false);
      setPin("");
      setConfirm("");
      setCurrentPin("");
      onChanged();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleBiometric = async () => {
    if (bioEnrolled) {
      removeBiometric(userId);
      setBioEnrolled(false);
      toast.success("أُلغيت البصمة على هذا الجهاز");
      return;
    }
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    const ok = await enrollBiometric(userId, meData.user.email, meData.user.name);
    if (ok) {
      setBioEnrolled(true);
      toast.success("تم تفعيل البصمة / FaceID على هذا الجهاز");
    } else {
      toast.error("تعذر التسجيل البيومتري — تأكد من توفر قارئ بصمة على الجهاز");
    }
  };

  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="font-display font-bold flex items-center gap-2"><Fingerprint size={18} className="text-cyan-300" /> رمز الأمان والبيومترية</h2>

      <div className="mt-4 space-y-3">
        {/* PIN */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", pinSet ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-300")}>
              {pinSet ? <BadgeCheck size={20} /> : <KeyRound size={19} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">رمز PIN {pinSet ? "مفعّل" : "غير مفعّل"}</p>
              <p className="text-[10px] text-[#59617f] leading-5 mt-0.5">يُخزن كـ bcrypt(SHA-256(PIN)) — الخادم لا يرى رمزك الصريح أبداً</p>
            </div>
          </div>
          <button onClick={() => setSetupOpen(true)} className="btn-ghost !text-[11px] shrink-0">
            {pinSet ? "تغيير" : "تفعيل"}
          </button>
        </div>

        {/* البيومترية */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", bioEnrolled ? "bg-emerald-400/10 text-emerald-400" : "bg-white/[0.04] text-[#8b93b8]")}>
              <Fingerprint size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">البصمة / FaceID</p>
              <p className="text-[10px] text-[#59617f] leading-5 mt-0.5">{bioSupported ? "مصادقة منصة الجهاز عبر WebAuthn — لا تُخزن بصمتك أي نموذج" : "غير مدعومة على هذا الجهاز/المتصفح"}</p>
            </div>
          </div>
          <button
            onClick={toggleBiometric}
            disabled={!bioSupported}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors shrink-0 disabled:opacity-30",
              bioEnrolled ? "bg-emerald-500" : "bg-white/15"
            )}
            role="switch"
            aria-checked={bioEnrolled}
            aria-label="تفعيل البصمة"
          >
            <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow", bioEnrolled ? "right-6" : "right-1")} />
          </button>
        </div>
      </div>

      {/* نافذة إعداد PIN */}
      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title={pinSet ? "تغيير رمز PIN" : "تفعيل رمز PIN"}>
        <form onSubmit={submitPin} className="space-y-3">
          {pinSet && (
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="input text-center tracking-[0.5em] font-mono2 text-lg" placeholder="الرمز الحالي" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))} autoFocus />
          )}
          <div className="grid grid-cols-2 gap-3">
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="input text-center tracking-[0.5em] font-mono2 text-lg" placeholder="٤٥٦٨٩٠" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} autoFocus={!pinSet} aria-label="رمز PIN الجديد" />
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="input text-center tracking-[0.5em] font-mono2 text-lg" placeholder="التأكيد" value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} aria-label="تأكيد رمز PIN" />
          </div>
          <p className="text-[10px] text-[#59617f] leading-6 text-center">4–6 أرقام · يُطلب عند فتح التطبيق بعد تسجيل الخروج أو الضغط على «قفل»</p>
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} حفظ الرمز
          </button>
        </form>
      </Modal>
    </section>
  );
}

/** ═══ منطقة الخطر ═══ */
function DangerZone({ email }: { email: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const deleteAccount = async () => {
    setBusy(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      toast.success("أُلغي حسابك ومُحيت كل بياناتك");
      router.replace("/");
    } else {
      toast.error("تعذر حذف الحساب");
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-rose-500/25 bg-rose-500/[0.04] p-6">
      <h2 className="font-display font-bold flex items-center gap-2 text-rose-300"><AlertTriangle size={18} /> منطقة الخطر</h2>
      <p className="text-[12px] text-[#c4a7ab] leading-7 mt-2">
        حذف الحساب يغيّر كل شيء إلى الأبد: تُمحى جلساتك، ملفاتك، ومجلداتك — مع تحرير بايتات التخزين المشفرة نهائياً. لا يمكن التراجع.
      </p>
      <button onClick={() => setConfirmOpen(true)} className="mt-4 text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-xl px-5 py-3 flex items-center gap-2 transition-colors">
        <Trash2 size={15} /> حذف حسابي نهائياً
      </button>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="حذف الحساب نهائياً">
        <p className="text-[13px] text-[#aab3d9] leading-7">اكتب بريدك الإلكتروني <span className="font-mono2 text-rose-300">{email}</span> للتأكيد:</p>
        <input className="input mt-3" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={email} dir="ltr" style={{ textAlign: "left" }} aria-label="تأكيد البريد" />
        <button
          onClick={deleteAccount}
          disabled={typed !== email || busy}
          className="mt-4 w-full text-sm font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl px-5 py-3.5 flex items-center justify-center gap-2 transition-colors"
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={16} />} حذف كل شيء إلى الأبد
        </button>
      </Modal>
    </section>
  );
}
