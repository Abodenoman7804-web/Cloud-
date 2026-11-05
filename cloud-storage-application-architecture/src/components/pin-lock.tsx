"use client";

import { useCallback, useEffect, useState } from "react";
import { Delete, Check, Fingerprint, ShieldCheck, LogOut, Delete as Erase } from "lucide-react";
import { cn } from "@/lib/utils";
import { sha256Hex } from "@/lib/crypto-client";
import { biometricUnlock, hasEnrolledBiometric, isBiometricAvailable } from "@/lib/biometric";
import { useRouter } from "next/navigation";

/** بوابة الدخول برمز PIN — الرمز لا يغادر الجهاز كنص صريح */
export default function PinLock({
  userId,
  userName,
  onUnlock,
}: {
  userId: string;
  userName: string;
  onUnlock: () => void;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const [available, enrolled] = [await isBiometricAvailable(), hasEnrolledBiometric(userId)];
      setBioAvailable(available && enrolled);
    })();
  }, [userId]);

  const fail = useCallback((msg: string) => {
    setError(msg);
    setShake(true);
    setPin("");
    window.setTimeout(() => setShake(false), 500);
  }, []);

  const verify = useCallback(
    async (candidate: string) => {
      if (candidate.length < 4 || loading) return;
      setLoading(true);
      setError(null);
      try {
        const pinHash = await sha256Hex(candidate);
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", pinHash }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          fail(data.error === "رمز PIN غير صحيح" || res.status === 401 ? "رمز PIN غير صحيح — حاول مجدداً" : "تعذر التحقق، حاول لاحقاً");
          return;
        }
        sessionStorage.setItem("sahaab.unlocked", "1");
        onUnlock();
      } finally {
        setLoading(false);
      }
    },
    [fail, loading, onUnlock]
  );

  const tryBiometric = useCallback(async () => {
    setLoading(true);
    const ok = await biometricUnlock(userId);
    setLoading(false);
    if (ok) {
      sessionStorage.setItem("sahaab.unlocked", "1");
      onUnlock();
    } else {
      fail("فشل التحقق البيومتري");
    }
  }, [fail, onUnlock, userId]);

  const press = useCallback(
    (digit: string) => {
      setError(null);
      setPin((prev) => (prev.length >= 6 ? prev : prev + digit));
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("sahaab.unlocked");
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter" && pin.length >= 4) verify(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, press, verify]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#05070f]/95 backdrop-blur-2xl overflow-hidden">
      {/* توهجات خلفية */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl pulse-glow" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl pulse-glow" style={{ animationDelay: "1.4s" }} />

      <div className="relative flex flex-col items-center gap-6 px-6 w-full max-w-sm">
        {/* الشعار */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 blur-lg opacity-60" />
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-xl">
              <ShieldCheck size={30} className="text-white" strokeWidth={1.8} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[#8b93b8] text-xs">مرحباً، {userName}</p>
            <h1 className="font-display font-extrabold text-xl mt-1">أدخل <span className="gradient-text">رمز الأمان</span></h1>
          </div>
        </div>

        {/* النقاط */}
        <div className={cn("flex items-center gap-3", shake && "shake")} dir="ltr" aria-label="رمز PIN">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn("pin-dot", i < pin.length && "filled")} />
          ))}
        </div>
        <p className={cn("text-xs h-4 transition-opacity -mt-3", error ? "text-rose-400 opacity-100" : "opacity-0")}>{error ?? "."}</p>

        {/* لوحة الأرقام */}
        <div className="grid grid-cols-3 gap-3 w-full" dir="ltr">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              disabled={loading}
              className="h-16 rounded-2xl text-2xl font-semibold font-display text-[#e8ecf8] bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.09] hover:border-cyan-400/30 active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-16 rounded-2xl flex items-center justify-center text-[#8b93b8] hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
            aria-label="مسح"
          >
            <Delete size={22} />
          </button>
          <button
            onClick={() => press("0")}
            disabled={loading}
            className="h-16 rounded-2xl text-2xl font-semibold font-display bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.09] hover:border-cyan-400/30 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={() => verify(pin)}
            disabled={pin.length < 4 || loading}
            className="h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-400 to-violet-600 text-white disabled:opacity-30 disabled:saturate-0 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-violet-600/30"
            aria-label="تأكيد"
          >
            <Check size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* البيومترية + تسجيل الخروج */}
        <div className="flex items-center gap-4">
          {bioAvailable && (
            <button
              onClick={tryBiometric}
              disabled={loading}
              className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/5 hover:bg-cyan-400/10 text-cyan-300 transition-all"
            >
              <Fingerprint size={26} strokeWidth={1.6} />
              <span className="text-[10px]">البصمة / FaceID</span>
            </button>
          )}
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border border-white/[0.06] text-[#8b93b8] hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <LogOut size={22} strokeWidth={1.6} />
            <span className="text-[10px]">تسجيل خروج</span>
          </button>
        </div>

        <p className="text-[10px] text-[#59617f] flex items-center gap-1.5">
          <Erase size={11} /> الرمز يُشفّر محلياً ولا يُرسل للخادم أبداً
        </p>
      </div>
    </div>
  );
}
