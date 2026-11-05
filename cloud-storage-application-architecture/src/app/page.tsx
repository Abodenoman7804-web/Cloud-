import Link from "next/link";
import {
  Cloud,
  UploadCloud,
  ShieldCheck,
  Play,
  Smartphone,
  Fingerprint,
  Gauge,
  ArrowLeft,
  Check,
  Lock,
  Zap,
  HardDrive,
  Layers,
  BadgeCheck,
  ChevronDown,
  Sparkles,
  Server,
  Eye,
  FileKey,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen app-bg text-[#e8ecf8] overflow-x-clip">
      {/* ═══════════ شريط التنقل ═══════════ */}
      <header className="fixed top-0 inset-x-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#090d1c]/70 backdrop-blur-xl px-4 sm:px-5 h-14">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Cloud size={17} className="text-white fill-white/25" />
              </div>
              <span className="font-display font-extrabold text-lg">سحاب<span className="text-cyan-400">.</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-7 text-sm text-[#aab3d9]">
              <a href="#features" className="hover:text-white transition-colors">المميزات</a>
              <a href="#security" className="hover:text-white transition-colors">الأمان</a>
              <a href="#how" className="hover:text-white transition-colors">كيف يعمل</a>
              <a href="#pricing" className="hover:text-white transition-colors">السعر</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-flex text-sm text-[#aab3d9] hover:text-white px-3 py-2 transition-colors">
                تسجيل الدخول
              </Link>
              <Link href="/register" className="btn-primary !py-2 !px-4 !text-xs sm:!text-sm">
                ابدأ مجاناً <ArrowLeft size={15} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ الواجهة الرئيسية ═══════════ */}
      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-24">
        <div className="absolute inset-0 tech-grid" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* النص التعريفي */}
          <div className="text-center lg:text-right">
            <div className="inline-flex items-center gap-2 chip mb-6 !text-[11px] !text-cyan-200 !border-cyan-400/30 !bg-cyan-400/[0.07]">
              <Sparkles size={13} /> جديد: رفع مجزأ مباشر بأربعة خيوط متوازية
            </div>

            <h1 className="font-display font-black text-4xl sm:text-5xl xl:text-6xl leading-[1.25] tracking-tight">
              <span className="gradient-text">تيرابايت كامل</span>
              <br />
              لحفظ حياتك الرقمية
              <br />
              <span className="text-[#aab3d9] text-3xl sm:text-4xl xl:text-5xl">بدون استهلاك هاتفك</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#8b93b8] leading-8 max-w-xl mx-auto lg:mx-0">
              سحاب هو مساحتك السحابية الشخصية بسعة <span className="text-white font-semibold">1 تيرابايت مجاناً</span> —
              صورك وفيديوهاتك تُشفّر على جهازك <span className="text-cyan-300">قبل</span> مغادرته، تُرفع مباشرة إلى التخزين
              الموزّع، وتُبث عند الطلب دون أي نسخة محلية.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Link href="/register" className="btn-primary text-base !px-7 !py-3.5">
                أنشئ مساحتك الآن — مجاناً <ArrowLeft size={18} />
              </Link>
              <a href="#how" className="btn-ghost text-sm">
                <Play size={15} className="text-cyan-300" /> كيف يعمل سحاب؟
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-[11px] sm:text-xs text-[#8b93b8]">
              {[
                { icon: ShieldCheck, text: "تشفير Zero-Knowledge" },
                { icon: Gauge, text: "رفع عبر 4 خيوط متوازية" },
                { icon: Smartphone, text: "صفر استهلاك لمساحة الهاتف" },
              ].map(({ icon: Icon, text }, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Icon size={14} className="text-emerald-400" /> {text}
                </span>
              ))}
            </div>
          </div>

          {/* الرسم المتحرك */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/25 via-violet-600/25 to-transparent blur-3xl rounded-full scale-90" />
            <div className="relative float-anim">
              <img
                src="/images/hero-cloud.jpg"
                alt="سحابة سحاب الزجاجية المتوهجة فوق خوادم مستقبلية"
                className="w-full aspect-[4/3] lg:aspect-[5/4] object-cover rounded-3xl border border-white/10 shadow-2xl shadow-violet-950/50"
              />
              {/* بطاقة الرفع العائمة */}
              <div className="absolute -bottom-4 -right-2 sm:right-6 glass rounded-2xl px-4 py-3 w-52 sm:w-60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#8b93b8] flex items-center gap-1.5"><UploadCloud size={12} className="text-cyan-300" /> رحلة_الغروب.mp4</span>
                  <span className="text-[9px] font-mono2 text-cyan-300">4×</span>
                </div>
                <div className="progress-track h-1.5" dir="ltr"><div className="progress-fill h-full w-[78%]" /></div>
                <p className="text-[9px] text-[#59617f] mt-1.5 font-mono2">AES-256-GCM · 8MB chunks · 78%</p>
              </div>
              {/* شارة التشفير */}
              <div className="absolute top-4 -left-2 sm:left-6 glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                  <Lock size={16} className="text-emerald-400" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-semibold">مشفر من طرف لآخر</p>
                  <p className="text-[8px] text-[#8b93b8]">الخادم لا يرى ملفاتك أبداً</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* شريط الأرقام */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 mt-14 sm:mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[var(--panel-border)]">
            {[
              { n: "1 TB", d: "مساحة لكل مستخدم" },
              { n: "AES-256", d: "تشفير GCM حقيقي" },
              { n: "8 MB", d: "حجم الجزء المجزأ" },
              { n: "$0", d: "رسوم الخروج (R2)" },
            ].map((s, i) => (
              <div key={i} className="bg-[#0b1020]/80 backdrop-blur px-4 py-5 text-center">
                <p className="font-display font-extrabold text-2xl gradient-text" dir="ltr">{s.n}</p>
                <p className="text-[10px] sm:text-[11px] text-[#8b93b8] mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ المميزات ═══════════ */}
      <section id="features" className="relative py-16 sm:py-24 border-t border-white/[0.05]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="chip mb-4 !text-[10px] !text-violet-300 !border-violet-400/30 !bg-violet-400/[0.06]"><Zap size={12}/> معمارية تفوق السرعة</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl">مصمم للوسائط الثقيلة،<br /><span className="gradient-text">خفيف على جهازك</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: UploadCloud, title: "رفع مباشر مجزأ", color: "text-cyan-300 bg-cyan-400/10", desc: "روابط موقّعة مسبقاً (Pre-signed URLs) ترفع أجزاء 8MB بتوازي 4 خيوط — دون أن تمر بياناتك عبر خادم الـ API. استئناف تلقائي عند انقطاع الاتصال." },
              { icon: ShieldCheck, title: "Zero-Knowledge حقيقي", color: "text-emerald-300 bg-emerald-400/10", desc: "مفتاح AES-256 مشتق من كلمة مرورك عبر PBKDF2 (100 ألف تكرار). التشفير والفك يتمان في متصفحك — السيرفرات ترى صوراً عشوائية فقط." },
              { icon: Play, title: "بث تدريجي فوري", color: "text-violet-300 bg-violet-400/10", desc: "فيديوهاتك تعمل مباشرة عبر HTTP Range Requests مع دعم التقديم والإرجاع — دون تحميل الملف كاملاً قبل المشاهدة." },
              { icon: Smartphone, title: "صفر بصمة محلية", color: "text-pink-300 bg-pink-400/10", desc: "الملفات تعيش سحابياً فقط. تظهر بصمات مصغرة WebP من ذاكرة تخزين مؤقت ذكية بحد أقصى 200MB تُدار بخوارزمية LRU — الأقدم يُمحى تلقائياً." },
              { icon: Fingerprint, title: "PIN + بصمة الوجه", color: "text-amber-300 bg-amber-400/10", desc: "بوابة دخول برمز 4–6 أرقام مشفّر محلياً كـ salted hash، مع دعم FaceID وFingerprint عبر WebAuthn — لا يغادر رمزك جهازك أبداً." },
              { icon: HardDrive, title: "حصة 1TB ذرّية", color: "text-blue-300 bg-blue-400/10", desc: "حد صارم عند 1,099,511,627,776 بايت يُفرض في قاعدة البيانات بمعاملة ذرّية — يستحيل تجاوز سعتك، مع استرداد فوري للحصة عند الإلغاء أو الحذف." },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} className="glass-soft rounded-2xl p-6 hover:border-cyan-400/20 transition-colors group">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <h3 className="font-display font-bold text-lg group-hover:text-white transition-colors">{title}</h3>
                <p className="text-[13px] text-[#8b93b8] leading-7 mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ كيف يعمل ═══════════ */}
      <section id="how" className="relative py-16 sm:py-24 border-t border-white/[0.05] bg-[#070a18]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="chip mb-4 !text-[10px]"><Layers size={12}/> دورة حياة الملف</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl">أربع خطوات، <span className="gradient-text">وصفر تنازلات</span></h2>
          </div>
          <ol className="grid md:grid-cols-4 gap-4">
            {[
              { step: "٠١", title: "اطلب الرفع", desc: "يصل الخادمَ طلبٌ باسم الحجم والنوع فقط — لا تمر البايتات عبره أبداً." },
              { step: "٠٢", title: "تحقّق وتوقيع", desc: "تُحجز مساحتك ذرّياً من حصة 1TB، ويُوقّع رابط رفع لكل جزء بصلاحية 10 دقائق." },
              { step: "٠٣", title: "شفّر وارفع", desc: "يُشفَّر كل جزء 8MB بـ AES-256-GCM على جهازك، ثم يُرفع مباشرة بأربعة خيوط." },
              { step: "٠٤", title: "بث فوري", desc: "عند الطلب تُفك الأجزاء محلياً وتُبث — دون تنزيل الملف كاملاً على جهازك." },
            ].map((s, i) => (
              <li key={i} className="relative glass-soft rounded-2xl p-6">
                <span className="font-display font-black text-4xl text-white/[0.07] absolute top-4 left-5" dir="ltr">{s.step}</span>
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center text-cyan-300 font-mono2 text-sm mb-4" dir="ltr">
                  {i + 1}
                </div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="text-[12px] text-[#8b93b8] leading-6 mt-1.5">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══════════ الأمان ═══════════ */}
      <section id="security" className="relative py-16 sm:py-24 border-t border-white/[0.05]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="chip mb-4 !text-[10px] !text-emerald-300 !border-emerald-400/30 !bg-emerald-400/[0.06]"><ShieldCheck size={12}/> معمارية الأمان</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl leading-snug">حتى نحن <span className="gradient-text">لا نستطيع</span><br />فتح ملفاتك</h2>
            <p className="mt-4 text-[#8b93b8] leading-8 text-[15px]">سحاب مبني على مبدأ المعرفة الصفرية: مفتاح التشفير يُشتق من كلمة مرورك على جهازك، ويُمحى من الذاكرة عند إغلاق التبويب. حتى لو تسرّبت قاعدة البيانات كاملة، فلن ترى سوى كتل عشوائية.</p>
            <ul className="mt-6 space-y-3">
              {[
                "اشتقاق المفتاح: PBKDF2-SHA256 بـ 100,000 تكرار + ملح عشوائي فريد لكل حساب",
                "التشفير: AES-256-GCM — كل جزء مستقل بـ IV عشوائي ووسم تحقق",
                "كلمات المرور: bcrypt بمعامل تكلفة 10 — لا تُخزّن أبداً كنص",
                "الجلسات: JWT قصير العمر + Refresh Tokens مُدوّرة ومخزّنة كـ SHA-256",
                "روابط المشاركة: المفتاح في #fragment — لا يصل الخادم أبداً",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#cdd3ee] leading-6">
                  <BadgeCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
          {/* لوحة شهادة الأمان */}
          <div className="glass rounded-2xl overflow-hidden" dir="ltr">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <span className="h-3 w-3 rounded-full bg-rose-400/80" /><span className="h-3 w-3 rounded-full bg-amber-400/80" /><span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 text-[10px] font-mono2 text-[#59617f]">sahaab — security-audit.log</span>
            </div>
            <div className="p-5 font-mono2 text-[11px] sm:text-xs leading-7 text-[#a5b4d4] overflow-x-auto">
              <p><span className="text-violet-400">$</span> sahaab audit --full</p>
              <p className="text-[#59617f]"># تشفير الملفات…</p>
              <p><span className="text-emerald-400">✓</span> algorithm <span className="text-cyan-300">AES-256-GCM</span></p>
              <p><span className="text-emerald-400">✓</span> kdf <span className="text-cyan-300">PBKDF2-HMAC-SHA256 ×100_000</span></p>
              <p><span className="text-emerald-400">✓</span> salt <span className="text-cyan-300">random-128bit / user</span></p>
              <p><span className="text-emerald-400">✓</span> password_hash <span className="text-cyan-300">bcrypt(cost=10)</span></p>
              <p className="text-[#59617f]"># تخزين API…</p>
              <p><span className="text-emerald-400">✓</span> upload <span className="text-cyan-300">presigned-put (hmac-sha256)</span></p>
              <p><span className="text-emerald-400">✓</span> quota <span className="text-cyan-300">atomic-reservation 1TiB</span></p>
              <p><span className="text-emerald-400">✓</span> tokens <span className="text-cyan-300">rotating-refresh sha256</span></p>
              <p><span className="text-emerald-400">✓</span> pin <span className="text-cyan-300">bcrypt(client-sha256)</span></p>
              <p className="mt-2 text-emerald-400">▌ ALL CHECKS PASSED — zero knowledge verified</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ الأسعار ═══════════ */}
      <section id="pricing" className="relative py-16 sm:py-24 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <span className="chip mb-4 !text-[10px]"><Sparkles size={12}/> خطة واحدة، كل شيء</span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">مجاني. <span className="gradient-text">تيرابايت كامل. للأبد.</span></h2>
          <div className="glass rounded-3xl p-8 mt-10 relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-56 w-96 bg-gradient-to-r from-cyan-500/20 to-violet-600/20 blur-3xl rounded-full" />
            <div className="relative">
              <p className="text-sm text-[#8b93b8]">سحاب — الخطة الشخصية</p>
              <p className="font-display font-black text-6xl mt-3" dir="ltr">$0<span className="text-lg text-[#8b93b8] font-sans font-normal"> / دائماً</span></p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-right mt-8 text-[13px] text-[#cdd3ee]">
                {[
                  "1 تيرابايت (1,099,511,627,776 بايت)",
                  "تشفير Zero-Knowledge كامل",
                  "رفع مجزأ مباشر 4× خيوط",
                  "بث Range للصوت والفيديو",
                  "مجلدات لا نهائية + مفضلتي وسلتي",
                  "روابط مشاركة منتهية الصلاحية",
                  "استئناف الرفع عند انقطاع النت",
                  "بدون بطاقة ائتمان — للأبد",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2"><Check size={15} className="text-cyan-300 shrink-0" /> {f}</li>
                ))}
              </ul>
              <Link href="/register" className="btn-primary w-full justify-center mt-8 !py-4 text-base">
                ابدأ رحلتك السحابية الآن <ArrowLeft size={18} />
              </Link>
              <p className="text-[10px] text-[#59617f] mt-4 flex items-center justify-center gap-1.5"><Eye size={11}/> بدون قراءة ملفاتك — يستحيل تقنياً، وليس وعداً تسويقياً</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ أسئلة شائعة ═══════════ */}
      <section className="py-14 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-center mb-8">أسئلة <span className="gradient-text">شائعة</span></h2>
          <div className="space-y-3">
            {[
              { q: "كيف يشاهد الخادم ملفاتي؟", a: "لا يشاهدها. كل بايت يُشفَّر على جهازك بـ AES-256-GCM قبل الرفع، والمفتاح مشتق من كلمة مرورك ولا يغادر جهازك. ما يصل للتخزين كتل غير قابلة للقراءة إطلاقاً." },
              { q: "ما الذي يحدث إذا نسيت كلمة المرور؟", a: "لا يمكن لأحد — ولا حتى نحن — استرجاع ملفاتك دون كلمة مرورك، لأن المفتاح يُشتق منها محلياً. احتفظ بها بأمان (ويمكنك استعادة الحساب نفسه ببريد جديد لكن دون الملفات)." },
              { q: "هل الرفع بطيء للفيديوهات الكبيرة؟", a: "العكس تماماً: تُقسَّم الفيديوهات إلى أجزاء 8MB تُرفع بأربعة خيوط متوازية مباشرة إلى التخزين، ويمكن استئناف الرفع من حيث توقف عند انقطاع الاتصال." },
              { q: "أين تُخزَّن بياناتي فعلياً؟", a: "على تخزين متوافق مع S3 (Cloudflare R2 / MinIO) موزّع عالمياً بدون رسوم خروج بيانات — لذلك يمكن تقديم تيرابايت كامل مجاناً وبسرعة من أي مكان." },
            ].map((item, i) => (
              <details key={i} className="glass-soft rounded-2xl group">
                <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 font-semibold text-[15px] list-none">
                  {item.q}
                  <ChevronDown size={18} className="text-[#8b93b8] transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-[13px] text-[#8b93b8] leading-7 border-t border-white/5 pt-4">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ تذييل ═══════════ */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <Cloud size={18} className="text-cyan-400" />
            <p className="text-sm text-[#8b93b8]">سحاب © {new Date().getFullYear()} — تخزينك. مشفّر. للأبد.</p>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-[#59617f]">
            <span className="flex items-center gap-1.5"><Server size={12}/> متوافق S3 / R2 / MinIO</span>
            <span className="flex items-center gap-1.5"><FileKey size={12}/> AES-256-GCM</span>
            <span className="flex items-center gap-1.5"><Lock size={12}/> Zero-Knowledge</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
