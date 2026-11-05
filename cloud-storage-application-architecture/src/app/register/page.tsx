"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cloud, Mail, Lock, User, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight, Check, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { deriveVaultKey, exportRawVaultKey } from "@/lib/crypto-client";
import { setVaultKeyFromRaw } from "@/lib/vault";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ["ضعيفة", "ضعيفة", "متوسطة", "قوية", "ممتازة"][strength];
  const strengthColor = ["bg-rose-500", "bg-rose-500", "bg-amber-400", "bg-cyan-400", "bg-emerald-400"][strength];

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setError(null);
      if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      if (password !== confirm) return setError("تأكيد كلمة المرور غير مطابق");

      setBusy(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "تعذر إنشاء الحساب");
          return;
        }
        try {
          const key = await deriveVaultKey(password, data.user.encryptionSalt);
          const raw = await exportRawVaultKey(key);
          await setVaultKeyFromRaw(raw);
        } catch {
          /* سيُعاد فتح الخزنة لاحقاً */
        }
        sessionStorage.setItem("sahaab.unlocked", "1");
        toast.success("مرحباً بك في سحاب — 1 تيرابايت بانتظارك");
        router.replace("/app");
      } finally {
        setBusy(false);
      }
    },
    [busy, confirm, email, name, password, router]
  );

  return (
    <div className="min-h-screen app-bg flex items-stretch">
      {/* نموذج التسجيل */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 xl:px-20 py-10 relative">
        <Link href="/" className="absolute top-6 right-6 sm:right-12 flex items-center gap-2 text-[#8b93b8] hover:text-white text-xs transition-colors">
          <ArrowRight size={14} /> الرئيسية
        </Link>
        <div className="w-full max-w-md mx-auto">
          <Link href="/" className="flex items-center gap-2.5 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center">
              <Cloud size={20} className="text-white fill-white/20" />
            </div>
            <span className="font-display font-extrabold text-2xl">سحاب<span className="text-cyan-400">.</span></span>
          </Link>

          <h1 className="font-display font-extrabold text-3xl">مساحتك <span className="gradient-text">التيرّابايتية</span> بانتظارك</h1>
          <p className="text-sm text-[#8b93b8] mt-2">دقيقة واحدة للتسجيل — ولا بطاقة ائتمان، ولا رسوم، ولا استثناءات.</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="name" className="text-xs text-[#aab3d9] mb-1.5 block">الاسم الكامل</label>
              <div className="relative">
                <User size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#59617f]" />
                <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="input !pr-11" placeholder="سارة المطيري" autoComplete="name" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="text-xs text-[#aab3d9] mb-1.5 block">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#59617f]" />
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input !pr-11" placeholder="you@example.com" dir="ltr" style={{ textAlign: "left" }} autoComplete="email" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-xs text-[#aab3d9] mb-1.5 block">كلمة المرور <span className="text-[#59617f]">(8 أحرف على الأقل — تُشتق منها مفتاح تشفيرك)</span></label>
              <div className="relative">
                <Lock size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#59617f]" />
                <input id="password" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="input !pr-11 !pl-11" placeholder="••••••••••" dir="ltr" style={{ textAlign: "left" }} autoComplete="new-password" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617f] hover:text-white" aria-label={show ? "إخفاء" : "إظهار"}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-2" dir="ltr">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < strength ? strengthColor : "bg-white/10")} />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#8b93b8] w-12">{strengthLabel}</span>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirm" className="text-xs text-[#aab3d9] mb-1.5 block">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#59617f]" />
                <input id="confirm" type={show ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input !pr-11" placeholder="••••••••••" dir="ltr" style={{ textAlign: "left" }} autoComplete="new-password" />
                {confirm && confirm === password && <Check size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />}
              </div>
            </div>

            {error && <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3 leading-6">{error}</p>}

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center !py-3.5 text-base">
              {busy ? <Loader2 size={19} className="animate-spin" /> : <HardDrive size={18} />}
              احجز تيرابايتي الآن
            </button>
          </form>

          <p className="text-sm text-[#8b93b8] mt-5 text-center">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200 font-semibold">تسجيل الدخول</Link>
          </p>
          <p className="text-[10px] text-[#59617f] mt-5 text-center leading-5">
            بإنشائك حساباً فأنت توافق على شروط الخدمة —<br />ومفتاح تشفيرك يُشتق محلياً ولن يطلبه أحد أبداً.
          </p>
        </div>
      </div>

      {/* لوحة فنية */}
      <div className="hidden lg:block relative w-[46%] xl:w-1/2 overflow-hidden">
        <img src="/images/hero-cloud.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#05070f] via-[#05070f]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-transparent to-[#05070f]/40" />
        <div className="absolute bottom-12 right-10 left-10">
          <p className="chip !text-emerald-300 !border-emerald-400/30 !bg-emerald-400/10 mb-4"><ShieldCheck size={12}/> تيرابايت كامل · مجاني للأبد</p>
          <p className="font-display font-bold text-2xl leading-snug text-white/95">«كل ذكرى تحفظها هنا<br />ملكك وحدك — مشفّرة.»</p>
          <p className="text-xs text-cyan-200/80 mt-3 font-mono2">PBKDF2 × 100,000 · AES-256-GCM</p>
        </div>
      </div>
    </div>
  );
}
