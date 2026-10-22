"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { ScoreResult } from "@/lib/score";
import { ipfs, pctf, scoreColor, usd } from "@/lib/format";

const LEVEL_TXT = { safe: "SAFE", caution: "CAUTION", suspicious: "SUSPICIOUS", danger: "DANGER" } as const;

function ScoreRing({ score, size = 84 }: { score: number; size?: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const col = scoreColor(score);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#252a26" strokeWidth={7} fill="none" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1.1 }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill={col} fontSize={size / 3.2} fontWeight={900}>{score}</text>
    </svg>
  );
}

function CoinFace({ r, compact }: { r: ScoreResult; compact?: boolean }) {
  const m = r.metrics;
  return (
    <div className="relative z-10 p-4">
      <div className="flex items-center gap-3">
        {r.image ? <img src={ipfs(r.image)} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className={`${compact ? "h-12 w-12" : "h-16 w-16"} rounded-xl object-cover`} /> : <div className="h-14 w-14 rounded-xl bg-coal-700" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-black">{r.name}</div>
          <div className="text-sm text-pump">${r.symbol}</div>
          <div className="mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-black tracking-widest" style={{ background: scoreColor(r.score), color: "#0b0d0c" }}>{LEVEL_TXT[r.level]}</div>
        </div>
        <ScoreRing score={r.score} size={compact ? 64 : 84} />
      </div>
      <div className={`mt-3 grid ${compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-6"} gap-2 text-center text-xs`}>
        {[
          ["MCap", usd(m.marketCapUsd)],
          ["Liq", usd(m.liquidityUsd)],
          ["Holders", m.holders?.toLocaleString() ?? "—"],
          ["Top10", pctf(m.top10Pct)],
          ["Dev", pctf(m.devPct, 2)],
          ["24h", pctf(m.change24h)],
        ].slice(0, compact ? 3 : 6).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-coal-950/70 py-1.5">
            <div className="text-gray-500">{k}</div>
            <div className="font-bold">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Bolt = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 100 300" className={className}>
    <polyline points="60,0 30,110 62,112 22,300 80,95 48,93 75,0" fill="#FACC15" stroke="#fff" strokeWidth="3" style={{ filter: "drop-shadow(0 0 12px #FACC15)" }} />
  </svg>
);

function Sparks({ n = 10, color = "#FACC15" }: { n?: number; color?: string }) {
  const pts = useMemo(() => Array.from({ length: n }, (_, i) => ({ x: Math.random() * 100, y: Math.random() * 100, d: 0.6 + Math.random(), delay: i * 0.15 })), [n]);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {pts.map((p, i) => (
        <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ left: `${p.x}%`, top: `${p.y}%`, background: color, boxShadow: `0 0 8px ${color}` }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.6, 0.2], y: [0, -14] }} transition={{ duration: p.d, delay: p.delay, repeat: Infinity, repeatDelay: 1.2 }} />
      ))}
    </div>
  );
}

function Claws() {
  return (
    <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {[0, 9, 18].map((o, i) => (
        <motion.path key={i} d={`M${55 + o} 5 Q ${45 + o} 50 ${30 + o} 95`} stroke="#1a0a00" strokeWidth="2.2" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5 + i * 0.12, duration: 0.25 }}
          style={{ filter: "drop-shadow(0 0 2px #FB923C)" }} />
      ))}
    </svg>
  );
}

export default function Reaction({ r, compact = false }: { r: ScoreResult; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"attack" | "tear" | "ash">("attack");
  useEffect(() => {
    if (r.level !== "danger") return;
    setPhase("attack");
    const t1 = setTimeout(() => setPhase("tear"), compact ? 1200 : 2600);
    const t2 = setTimeout(() => setPhase("ash"), compact ? 2600 : 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [r.mint, r.level, run, compact]);

  const replay = (
    <button onClick={() => setRun((x) => x + 1)} className="absolute right-2 top-2 z-40 rounded-md bg-coal-950/80 px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-pump">↻ replay</button>
  );

  if (r.level === "safe") {
    return (
      <motion.div key={run} className="card relative overflow-hidden border-pump/60 shadow-neon" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {replay}
        <motion.div className="absolute inset-0 rounded-2xl" animate={{ boxShadow: ["inset 0 0 0px #4ADE80", "inset 0 0 30px #4ADE80", "inset 0 0 0px #4ADE80"] }} transition={{ duration: 2.4, repeat: Infinity }} />
        <Sparks n={5} color="#4ADE80" />
        <div className={compact ? "" : "flex items-center"}>
          <div className="flex-1"><CoinFace r={r} compact={compact} /></div>
          {!compact && (
            <motion.img src="/mascot-calm.jpg" alt="PokeSnap calm" className="z-10 m-4 h-40 w-40 rounded-2xl object-cover" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} />
          )}
        </div>
        <div className="relative z-10 px-4 pb-3 text-xs text-pump">⚡ PokeSnap approves. Card stays clean.</div>
      </motion.div>
    );
  }

  if (r.level === "caution") {
    return (
      <motion.div key={run} className="card relative overflow-hidden border-volt/60 shadow-volt" initial={{ opacity: 0 }}
        animate={{ opacity: 1, x: [0, -6, 6, -5, 5, -2, 2, 0], rotate: [0, -1, 1, -1, 0] }} transition={{ duration: 0.8, delay: 0.2 }}>
        {replay}
        <Sparks n={14} />
        <CoinFace r={r} compact={compact} />
        <div className="relative z-10 px-4 pb-3 text-xs text-volt">⚠️ PokeSnap growls — sparks flying. Check the flags below.</div>
      </motion.div>
    );
  }

  if (r.level === "suspicious") {
    return (
      <motion.div key={run} className="card scorched relative overflow-hidden border-orange-500/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {replay}
        <motion.div className="pointer-events-none absolute inset-0 z-30 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0, 0.6, 0] }} transition={{ duration: 0.6, delay: 0.25 }} />
        <motion.div className="pointer-events-none absolute -top-4 left-1/3 z-30 h-full w-16" initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: [0, 1, 1, 0], scaleY: [0, 1, 1, 1] }} transition={{ duration: 0.7, delay: 0.2 }} style={{ originY: 0 }}>
          <Bolt className="h-full w-full" />
        </motion.div>
        <Claws />
        <motion.div initial={{ filter: "sepia(0) brightness(1)" }} animate={{ filter: "sepia(.6) brightness(.75) contrast(1.1)" }} transition={{ delay: 0.5, duration: 0.6 }}>
          <CoinFace r={r} compact={compact} />
        </motion.div>
        <div className="relative z-10 px-4 pb-3 text-xs text-orange-400">⚡ Struck by lightning & clawed. Suspicious patterns found.</div>
      </motion.div>
    );
  }

  // DANGER: attack -> tear -> ash
  const frags = (r.reasons.length ? r.reasons : ["Multiple critical risk factors"]).slice(0, 6);
  const pieces = Array.from({ length: compact ? 6 : 9 }, (_, i) => i);
  return (
    <div key={run} className={`card relative overflow-hidden border-red-500/70 shadow-danger ${compact ? "min-h-[230px]" : "min-h-[440px]"}`}>
      {replay}
      <AnimatePresence mode="wait">
        {phase === "attack" && (
          <motion.div key="attack" className="absolute inset-0" exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 opacity-60" animate={{ x: [0, -8, 8, -8, 8, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
              <CoinFace r={r} compact={compact} />
            </motion.div>
            {compact ? (
              <motion.img src="/mascot-attack.jpg" className="absolute inset-0 z-20 h-full w-full object-cover" initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 0.95 }} transition={{ duration: 0.35 }} alt="" />
            ) : (
              <motion.video src="/mascot-attack.mp4" poster="/mascot-attack.jpg" autoPlay muted playsInline className="absolute inset-0 z-20 h-full w-full object-cover"
                initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} />
            )}
            <motion.div className="pointer-events-none absolute inset-0 z-30 bg-volt mix-blend-screen" animate={{ opacity: [0, 0.7, 0, 0.5, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.6 }} />
          </motion.div>
        )}
        {phase !== "attack" && (
          <motion.div key="rip" className="absolute inset-0 grid grid-cols-3 gap-1 p-2">
            {pieces.map((i) => {
              const ang = (i / pieces.length) * Math.PI * 2 + 0.4;
              const ash = phase === "ash";
              return (
                <motion.div key={i} className="scorched flex items-center justify-center rounded-lg border border-red-900/70 bg-coal-800 p-2 text-center text-[10px] font-semibold leading-tight text-red-200"
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={ash
                    ? { x: Math.cos(ang) * 60, y: 70 + (i % 3) * 18, rotate: (i % 2 ? 1 : -1) * 70, opacity: 0.6, scale: 0.7, filter: "grayscale(.85) brightness(.7)" }
                    : { x: Math.cos(ang) * 26, y: Math.sin(ang) * 22, rotate: (i % 2 ? 1 : -1) * (8 + i * 2), opacity: 1 }}
                  transition={{ duration: ash ? 1.2 : 0.4, ease: ash ? "easeIn" : "backOut" }}
                  style={{ clipPath: `polygon(${i % 3 ? 6 : 0}% 0, 100% ${i % 2 ? 8 : 0}%, ${i % 2 ? 92 : 100}% 100%, 0 ${i % 3 ? 94 : 100}%)` }}>
                  {frags[i % frags.length]}
                </motion.div>
              );
            })}
            {phase === "ash" && (
              <>
                <motion.div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-600/40 to-transparent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center" initial={{ scale: 3, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
                  <div className={`rounded-lg border-4 border-red-500 px-5 py-1 font-black tracking-[0.25em] text-red-500 ${compact ? "text-3xl" : "text-6xl"}`} style={{ textShadow: "0 0 20px #EF4444" }}>ZAPPED</div>
                  <div className="mt-3 rotate-12 rounded bg-coal-950/90 px-3 py-1 text-center">
                    <div className="font-black">{r.name} <span className="text-pump">${r.symbol}</span></div>
                    <div className="text-sm text-red-400">score {r.score}/100</div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
