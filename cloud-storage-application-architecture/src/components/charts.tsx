/** مكونات الرسوم البيانية (SVG خالص — بدون مكتبات ثقيلة) */

export function StorageDonut({
  percent,
  size = 168,
  stroke = 16,
  usedLabel,
  limitLabel,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  usedLabel: string;
  limitLabel: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`تم استخدام ${clamped.toFixed(1)}% من المساحة`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="45%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="donutGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#6366f1" floodOpacity="0.55" />
          </filter>
        </defs>
        <circle cx={center} cy={center} r={radius} stroke="rgba(148,184,255,0.10)" strokeWidth={stroke} fill="none" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#donutGradient)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#donutGlow)"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-extrabold text-2xl leading-none gradient-text">{clamped < 0.1 ? "0" : clamped.toFixed(clamped < 10 ? 1 : 0)}%</span>
        <span className="text-[10px] text-[#8b93b8] mt-1.5">{usedLabel}</span>
        <span className="text-[9px] text-[#59617f] mt-0.5">من {limitLabel}</span>
      </div>
    </div>
  );
}

export function TrendBars({ data }: { data: { month: string; bytes: number }[] }) {
  const max = Math.max(...data.map((d) => d.bytes), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-36 pt-2" dir="rtl">
      {data.map((d, i) => {
        const height = Math.max(4, (d.bytes / max) * 100);
        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
            <div className="w-full flex items-end justify-center h-24">
              <div
                className="w-full max-w-[38px] rounded-t-lg rounded-b-sm bg-gradient-to-t from-blue-600/70 via-cyan-500/80 to-cyan-300 group-hover:from-violet-600 group-hover:to-cyan-300 transition-all duration-300 relative"
                style={{ height: `${height}%` }}
                title={d.bytes > 0 ? `${(d.bytes / (1024 * 1024)).toFixed(1)} MB` : "0"}
              >
                {d.bytes > 0 && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono2 text-cyan-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {d.bytes >= 1024 * 1024 * 1024 ? `${(d.bytes / 1024 ** 3).toFixed(1)}G` : `${(d.bytes / 1024 ** 2).toFixed(0)}M`}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-[#8b93b8]">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryBar({ segments }: { segments: { label: string; bytes: number; color: string }[] }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.bytes, 0));
  const visible = segments.filter((s) => s.bytes > 0);
  if (visible.length === 0) {
    return <div className="h-2.5 rounded-full bg-white/5" />;
  }
  return (
    <div className="h-2.5 rounded-full overflow-hidden flex bg-white/5" dir="rtl">
      {visible.map((s, i) => (
        <div
          key={i}
          className="h-full transition-all duration-700"
          style={{ width: `${(s.bytes / total) * 100}%`, background: s.color }}
          title={`${s.label}`}
        />
      ))}
    </div>
  );
}
