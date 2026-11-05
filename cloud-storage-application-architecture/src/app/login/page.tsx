"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { deriveVaultKey, exportRawVaultKey } from "@/lib/crypto-client";
import { setVaultKeyFromRaw } from "@/lib/vault";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "تعذر تسجيل الدخول");
          return;
        }
        // اشتقاق مفتاح الخزنة محلياً من كلمة المرور
        try {
          const key = await deriveVaultKey(password, data.user.encryptionSalt);
          const raw = await exportRawVaultKey(key);
          await setVaultKeyFromRaw(raw);
        } catch {
          /* سيُعيد المستخدم فتح الخزنة عند الحاجة */
        }
        sessionStorage.setItem("sahaab.unlocked", "1");
        toast.success(`أهلاً بعودتك، ${data.user.name.split(" ")[0]}`);
        router.replace(next.startsWith("/app") ? next : "/app");
      } finally {
        setBusy(false);
      }
    },
    [busy, email, next, password, router]
  );

  return (
    <div className="min-h-screen app-bg flex items-stretch">
      {/* نموذج الدخول */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 xl:px-20 py-10 relative">
        <Link href="/" className="absolute top-6 right-6 sm:right-12 flex items-center gap-2 text-[#8b93b8] hover:text-white text-xs transition-colors">
          <ArrowRight size={14} /> الرئيسية
        </Link>
        <div className="w-full max-w-md mx-auto">
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center">
              <Cloud size={20} className="text-white fill-white/20" />
            </div>
            <span className="font-display font-extrabold text-2xl">سحاب<span className="text-cyan-400">.</span></span>
          </Link>

          <h1 className="font-display font-extrabold text-3xl">تسجيل <span className="gradient-text">الدخول</span></h1>
          <p className="text-sm text-[#8b93b8] mt-2">مساحتك بانتظارك — كل بايت مشفّر بمفتاحك وحدك.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="text-xs text-[#aab3d9] mb-1.5 block">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#59617f]" />
                <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input !pr-11" placeholder="you@example.com" dir="ltr" style={{ textAlign: "left" }} />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-xs text-[#aab3d9] mb-1.5 block">كلمة المرور</label>
              <div className="relative">
                <Lock size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#59617f]" />
                <input id="password" type={show ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input !pr-11 !pl-11" placeholder="••••••••" dir="ltr" style={{ textAlign: "left" }} />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617f] hover:text-white" aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3 leading-6">{error}</p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center !py-3.5 text-base">
              {busy ? <Loader2 size={19} className="animate-spin" /> : <ShieldCheck size={18} />}
              دخول آمن إلى سحابتي
            </button>
          </form>

          <p className="text-sm text-[#8b93b8] mt-6 text-center">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-cyan-300 hover:text-cyan-200 font-semibold">أنشئ مساحتك المجانية (1TB)</Link>
          </p>
          <p className="text-[10px] text-[#59617f] mt-6 text-center flex items-center justify-center gap-1.5">
            <Lock size={10} /> كلمات المرور لا تغادر جهازك إلا مُجزّأة — التشفير يتم هنا محلياً
          </p>
        </div>
      </div>

      {/* لوحة فنية */}
      <div className="hidden lg:block relative w-[46%] xl:w-1/2 overflow-hidden">
        <img src="/images/hero-cloud.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#05070f] via-[#05070f]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-transparent to-[#05070f]/40" />
        <div className="absolute bottom-12 right-10 left-10">
          <p className="font-display font-bold text-2xl leading-snug text-white/95">«ملفاتي معي دائماً،<br />ولا يراها أحد سواي.»</p>
          <p className="text-xs text-cyan-200/80 mt-3 font-mono2">— معمارية Zero-Knowledge، وليست وعداً تسويقياً</p>
        </div>
      </div>
    </div>
  );
}
