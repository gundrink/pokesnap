"use client";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Embers, SeamArcs, boltPath, buildShards, crackLine, flight, hash, rng } from "./Shatter";

/* shared motion vocabulary — springs, not tweens */
const SPRING_ENTER = { type: "spring", stiffness: 120, damping: 26, mass: 1 } as const;
const EASE_OUT = [0.16, 1, 0.3, 1] as const; // expo-ish out
const EASE_IN = [0.55, 0, 0.85, 0.35] as const;
const SOFT = [0.25, 0.1, 0.25, 1] as const;
/** decaying, irregular shake keyframes (seeded) — no metronome wiggle */
function shake(seed: number, amp: number, n = 7) { const r = rng(seed); const x = [0], y = [0], rot = [0];
  for (let i = 1; i < n; i++) { const d = Math.pow(1 - i / n, 1.7); x.push((r() - 0.5) * 2 * amp * d); y.push((r() - 0.5) * 1.4 * amp * d); rot.push((r() - 0.5) * amp * 0.12 * d); }
  x.push(0); y.push(0); rot.push(0); return { x, y, rotate: rot }; }
import type { ScoreResult } from "@/lib/score";
import { ipfs, pctf, scoreColor, usd } from "@/lib/format";

const LEVEL_TXT = { safe: "SAFE", caution: "CAUTION", suspicious: "SUSPICIOUS", danger: "DANGER" } as const;

function ScoreRing({ score, size = 84 }: { score: number; size?: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const col = scoreColor(score);
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? score : 0);
  const off = useTransform(mv, (v) => c * (1 - v / 100));
  const [shown, setShown] = useState(reduce ? score : 0);
  useEffect(() => { if (reduce) { mv.set(score); setShown(score); return; }
    const ctl = animate(mv, score, { type: "spring", stiffness: 32, damping: 18, mass: 1.1, delay: 0.3 });
    const un = mv.on("change", (v) => setShown(Math.max(0, Math.round(v)))); return () => { ctl.stop(); un(); }; }, [score, reduce, mv]);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#252a26" strokeWidth={7} fill="none" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={c}
        style={{ strokeDashoffset: off, filter: `drop-shadow(0 0 2px ${col}66)` }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill={col} fontSize={size / 3.2} fontWeight={900} style={{ fontVariantNumeric: "tabular-nums" }}>{shown}</text>
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

const Bolt = ({ className = "", seed = 1 }: { className?: string; seed?: number }) => {
  const b = useMemo(() => boltPath(seed), [seed]);
  return (
    <svg viewBox="0 0 100 300" className={className} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      <path d={b.main} fill="none" stroke="#fde68a" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" opacity={0.25} style={{ filter: "blur(3px)" }} />
      {b.forks.map((f, i) => <path key={i} d={f} fill="none" stroke="#fff8e1" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />)}
      <path d={b.main} fill="none" stroke="#fffbea" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/** rubber-stamp ink look: turbulence-eroded edges, uneven ink, seeded tilt */
function Stamp({ seed, color, compact, big }: { seed: number; color: string; compact: boolean; big?: boolean }) {
  const r = rng(seed ^ 0x57a3); const tilt = -9 - r() * 7; const fid = `ink${seed}`;
  return (
    <div className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <svg width="0" height="0" className="absolute">
        <filter id={fid}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed % 97} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="c" />
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={(seed % 89) + 3} result="w" />
          <feDisplacementMap in="c" in2="w" scale="3.5" /></filter>
      </svg>
      <div className={`rounded-md px-5 py-0.5 font-black ${big ? (compact ? "text-3xl" : "text-7xl") : compact ? "text-2xl" : "text-5xl"}`}
        style={{ color, border: `${big ? 6 : 5}px solid ${color}`, letterSpacing: "0.18em", filter: `url(#${fid})`, opacity: 1,
          background: "rgba(11,13,12,0.78)", textShadow: "0 1px 0 rgba(0,0,0,.4)", fontFamily: "Impact, 'Arial Black', system-ui, sans-serif" }}>
        {"ZAPPED".split("").map((ch, i) => <span key={i} style={{ display: "inline-block", transform: `translateY(${(r() - 0.5) * 3}px) rotate(${(r() - 0.5) * 4}deg)` }}>{ch}</span>)}
      </div>
    </div>
  );
}

function Sparks({ n = 10, color = "#FACC15" }: { n?: number; color?: string }) {
  const pts = useMemo(() => Array.from({ length: n }, () => ({ x: Math.random() * 100, y: Math.random() * 100, d: 0.5 + Math.random() * 1.1, delay: Math.random() * 1.8, s: 0.5 + Math.random() ** 2 * 1.4, rd: 0.6 + Math.random() * 2.2, dy: -6 - Math.random() * 18, dx: (Math.random() - 0.5) * 10 })), [n]);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {pts.map((p, i) => (
        <motion.span key={i} className="absolute h-1 w-1 rounded-full" style={{ left: `${p.x}%`, top: `${p.y}%`, background: color, boxShadow: `0 0 3px ${color}88` }}
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0], scale: [0.3, p.s, 0.1], y: [0, p.dy], x: [0, p.dx] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, repeatDelay: p.rd, ease: EASE_OUT, times: [0, 0.18, 1] }} />
      ))}
    </div>
  );
}

export default function Reaction({ r, compact = false }: { r: ScoreResult; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("attack");
  const reduce = useReducedMotion();
  const seed = useMemo(() => hash(r.mint + ":" + run), [r.mint, run]);
  const cshake = useMemo(() => shake(seed, 2.5, 8), [seed]);
  useEffect(() => {
    if (r.level !== "danger") return;
    if (reduce) { setPhase("stamp"); return; }
    setPhase("attack");
    const a = compact ? 1200 : 2600;
    const ts = [setTimeout(() => setPhase("strike"), a), setTimeout(() => setPhase("shatter"), a + 520), setTimeout(() => setPhase("stamp"), a + 1380)];
    return () => ts.forEach(clearTimeout);
  }, [r.mint, r.level, run, compact, reduce]);

  const replay = (
    <button onClick={() => setRun((x) => x + 1)} className="absolute right-2 top-2 z-40 rounded-md bg-coal-950/80 px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-pump">↻ replay</button>
  );

  if (r.level === "safe") {
    return (
      <motion.div key={run} className="card relative overflow-hidden border-pump/40" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: SOFT }}
        whileHover={{ y: -1, transition: { duration: 0.3, ease: SOFT } }}>
        {replay}
        <motion.div className="absolute inset-0 rounded-2xl" animate={{ boxShadow: ["inset 0 0 0px #4ADE8000", "inset 0 0 22px #4ADE8030", "inset 0 0 0px #4ADE8000"] }} transition={{ duration: 3.7, repeat: Infinity, ease: "easeInOut" }} />
        <Sparks n={5} color="#4ADE80" />
        <div className={compact ? "" : "flex items-center"}>
          <div className="flex-1"><CoinFace r={r} compact={compact} /></div>
          {!compact && (
            <motion.img src="/mascot-calm.jpg" alt="PokeSnap calm" className="z-10 m-4 h-40 w-40 rounded-2xl object-cover" initial={{ scale: 0.86, opacity: 0, rotate: -3, y: 8 }} animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 90, damping: 20, delay: 0.32 }} />
          )}
        </div>
        <div className="relative z-10 px-4 pb-3 text-xs text-pump">⚡ PokeSnap approves. Card stays clean.</div>
      </motion.div>
    );
  }

  if (r.level === "caution") {
    return (
      <motion.div key={run} className="card relative overflow-hidden border-volt/50" initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, ...cshake } as never}
        transition={{ opacity: { duration: 0.3 }, y: SPRING_ENTER, default: { duration: 0.7, delay: 0.35, ease: EASE_OUT } }}>
        {replay}
        <Sparks n={14} />
        <CoinFace r={r} compact={compact} />
        <div className="relative z-10 px-4 pb-3 text-xs text-volt">⚠️ PokeSnap growls — sparks flying. Check the flags below.</div>
      </motion.div>
    );
  }

  if (r.level === "suspicious") return <Suspicious r={r} compact={compact} run={run} replay={replay} reduce={!!reduce} seed={seed} />;

  return <Danger r={r} compact={compact} run={run} replay={replay} phase={phase} reduce={!!reduce} seed={seed} />;
}

type Phase = "attack" | "strike" | "shatter" | "stamp";

function Danger({ r, compact, run, replay, phase, reduce, seed }: { r: ScoreResult; compact: boolean; run: number; replay: React.ReactNode; phase: Phase; reduce: boolean; seed: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState({ w: 600, h: 440 });
  useLayoutEffect(() => { if (box.current) setSz({ w: box.current.offsetWidth, h: box.current.offsetHeight }); }, [run]);
  const { shards, seams } = useMemo(() => buildShards(seed, compact ? 3 : 5, compact ? 2 : 4), [seed, compact]);
  const flights = useMemo(() => { const rr = rng(seed ^ 0x51ed); return shards.map((s) => flight(s, rr, sz.w, sz.h)); }, [shards, seed, sz]);
  const origins = useMemo(() => seams.flatMap((s) => [s[Math.floor(s.length / 2)]]), [seams]);
  const flew = phase === "shatter" || phase === "stamp";
  const dshake = useMemo(() => shake(seed ^ 0xd1, 5.5, 9), [seed]);
  const sshake = useMemo(() => shake(seed ^ 0x5a, 2.5, 6), [seed]);
  const face = (
    <div className="absolute inset-0 rounded-2xl bg-coal-900">
      <CoinFace r={r} compact={compact} />
      <div className="px-4 text-[11px] leading-snug text-red-300/90">{r.reasons.slice(0, 4).map((x) => <div key={x}>✖ {x}</div>)}</div>
    </div>
  );
  return (
    <motion.div key={run} ref={box}
      className={`card relative border-red-500/70 shadow-danger ${flew ? "overflow-visible" : "overflow-hidden"} ${compact ? "min-h-[230px]" : "min-h-[440px]"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={phase === "strike" ? { opacity: 1, ...dshake, scaleX: [1, 1.012, 0.994, 1], scaleY: [1, 0.982, 1.006, 1] }
        : phase === "stamp" && !reduce ? { opacity: 1, ...sshake } : { opacity: 1, x: 0, y: 0, rotate: 0 }}
      transition={phase === "attack" ? SPRING_ENTER : phase === "stamp" ? { duration: 0.55, delay: 0.08, ease: EASE_OUT } : { duration: 0.5, ease: EASE_OUT }}
      style={{ willChange: "transform" }}>
      {replay}
      <AnimatePresence>
        {phase === "attack" && (
          <motion.div key="attack" className="absolute inset-0 overflow-hidden rounded-2xl" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <motion.div className="absolute inset-0 opacity-60" animate={{ x: [0, -3, 2, -1.5, 0.5, 0], y: [0, 1, -1, 0.5, 0, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" }}>{face}</motion.div>
            {compact ? (
              <motion.img src="/mascot-attack.jpg" className="absolute inset-0 z-20 h-full w-full object-cover" initial={{ scale: 1.25, opacity: 0 }} animate={{ scale: 1, opacity: 0.95 }} transition={{ type: "spring", stiffness: 180, damping: 18 }} alt="" />
            ) : (
              <motion.video src="/mascot-attack.mp4" poster="/mascot-attack.jpg" autoPlay muted playsInline className="absolute inset-0 z-20 h-full w-full object-cover"
                initial={{ scale: 1.18, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 20 }} />
            )}
            <motion.div className="pointer-events-none absolute inset-0 z-30 bg-[#fff6d5] mix-blend-soft-light" animate={{ opacity: [0, 0.45, 0.05, 0.3, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.9, times: [0, 0.06, 0.3, 0.38, 1] }} />
          </motion.div>
        )}
      </AnimatePresence>

      {phase !== "attack" && (
        <>
          {/* shards: full card face clipped into jagged polygons, charred rim, ballistic flight */}
          {shards.map((s, i) => {
            const f = flights[i];
            const clip = `polygon(${s.poly.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(",")})`;
            return (
              <motion.div key={i} className="pointer-events-none absolute inset-0 z-20"
                style={{ transformOrigin: `${s.cx}% ${s.cy}%`, willChange: "transform, opacity" }}
                initial={{ x: 0, y: 0, rotate: 0, rotateX: 0, opacity: 1 }}
                animate={flew && !reduce ? { x: f.x, y: f.y, rotate: f.rot, rotateX: [0, f.rx], opacity: f.op, filter: ["blur(0px)", "blur(1.2px)", "blur(0.4px)", "blur(0px)"] } : phase === "strike" ? { x: (s.cx - 50) * 0.05, y: (s.cy - 50) * 0.05, rotate: (s.cx - 50) * 0.01 } : { opacity: 0.25 }}
                transition={flew && !reduce ? { duration: f.T, times: f.times, ease: "linear", delay: f.delay, rotateX: { duration: f.T, ease: EASE_OUT, delay: f.delay }, filter: { duration: 0.5, times: [0, 0.15, 0.6, 1], delay: f.delay } } : { type: "spring", stiffness: 400, damping: 14 }}>
                <div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip }}>
                  {face}
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points={s.poly.map((p) => p.join(",")).join(" ")} fill="none" stroke="#120600" strokeWidth={14} vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={0.95} />
                    <polygon points={s.poly.map((p) => p.join(",")).join(" ")} fill="none" stroke="#d9531c" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={0.7} />
                  </svg>
                  <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: flew ? 0.55 : 0.2 }} transition={{ duration: 0.8 }}
                    style={{ background: "radial-gradient(circle at 50% 50%, transparent 30%, #1a0a00cc 100%)" }} />
                </div>
              </motion.div>
            );
          })}
          {!reduce && <SeamArcs seams={seams} seed={seed} dur={phase === "strike" ? 0.5 : 0.7} />}
          {/* lightning bolt + white flash */}
          {!reduce && (
            <>
              <motion.div className="pointer-events-none absolute -top-6 left-[38%] z-40 h-[110%] w-24" initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                animate={{ opacity: [0, 1, 0.2, 1, 0], clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)"] }} transition={{ duration: 0.55, times: [0, 0.12, 0.3, 0.42, 1] }}>
                <Bolt className="h-full w-full" seed={seed} />
              </motion.div>
              <motion.div className="pointer-events-none fixed inset-0 z-[60] bg-[#fffaf0]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.26, 0.03, 0.12, 0] }} transition={{ duration: 0.6, times: [0, 0.05, 0.22, 0.32, 1], ease: "easeOut" }} />
              <motion.div className="pointer-events-none absolute inset-0 z-10 rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4] }} transition={{ duration: 0.6 }}
                style={{ background: "radial-gradient(circle at 50% 50%, #ffe9b033, #ff8a3d14 40%, transparent 70%)" }} />
              <Embers origins={origins} count={compact ? 80 : 180} delay={520} duration={3200} />
            </>
          )}
          {/* scorched void where card was */}
          <motion.div className="absolute inset-0 z-0 rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: flew ? 1 : 0 }} transition={{ duration: 0.6 }}
            style={{ background: "radial-gradient(ellipse at 50% 60%, #2a0d05 0%, #0b0d0c 70%)", boxShadow: "inset 0 0 50px #ff3b1f2a" }} />
          {phase === "stamp" && (
            <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center"
              initial={reduce ? { opacity: 1 } : { scale: 1.35, opacity: 0, y: -8 }} animate={{ scale: [null, 0.98, 1], opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { scale: { duration: 0.55, times: [0, 0.55, 1], ease: [EASE_IN, EASE_OUT] }, opacity: { duration: 0.2 }, y: { duration: 0.3, ease: EASE_IN } }}>
              {!reduce && <motion.div className="absolute h-36 w-56 rounded-[45%] border-2 border-red-500/60" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 2.4, opacity: [0, 0.6, 0] }} transition={{ duration: 0.8, delay: 0.22, ease: EASE_OUT }} />}
              <Stamp seed={seed} color="#e0393e" compact={compact} big />
              <motion.div className="mt-4 rounded bg-coal-950/90 px-3 py-1 text-center" initial={{ opacity: 0, y: 8, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: 4 }} transition={{ type: "spring", stiffness: 110, damping: 22, delay: 0.4 }}>
                <div className="font-black">{r.name} <span className="text-pump">${r.symbol}</span></div>
                <div className="text-sm text-red-400">score {r.score}/100</div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

type SPhase = "hit" | "crack" | "split" | "stamp";

function Suspicious({ r, compact, run, replay, reduce, seed }: { r: ScoreResult; compact: boolean; run: number; replay: React.ReactNode; reduce: boolean; seed: number }) {
  const [ph, setPh] = useState<SPhase>(reduce ? "stamp" : "hit");
  useEffect(() => {
    if (reduce) { setPh("stamp"); return; }
    setPh("hit");
    const ts = [setTimeout(() => setPh("crack"), 380), setTimeout(() => setPh("split"), 1240), setTimeout(() => setPh("stamp"), 1980)];
    return () => ts.forEach(clearTimeout);
  }, [run, reduce, r.mint]);
  const line = useMemo(() => crackLine(seed), [seed]);
  const pts = line.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const leftPoly = [[0, 0], ...line, [0, 100]] as [number, number][];
  const rightPoly = [...line, [100, 100], [100, 0]] as [number, number][];
  const clip = (P: [number, number][]) => `polygon(${P.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(",")})`;
  const split = ph === "split" || ph === "stamp";
  const hs = useMemo(() => shake(seed ^ 0x41, 2, 7), [seed]);
  const ss = useMemo(() => shake(seed ^ 0x42, 2, 6), [seed]);
  const jr = useMemo(() => { const q = rng(seed ^ 0x99); return { l: -3.2 - q() * 2, rr: 2.6 + q() * 2, ly: 0.25 + q() * 0.2, ry: 0.05 + q() * 0.2, d: 0.03 + q() * 0.06 }; }, [seed]);
  const cracked = ph !== "hit";
  const face = (
    <div className="absolute inset-0 rounded-2xl border border-orange-500/70 bg-coal-900" style={{ filter: cracked ? "sepia(.55) brightness(.78) contrast(1.1)" : undefined }}>
      <CoinFace r={r} compact={compact} />
      <div className="relative z-10 px-4 pb-3 text-xs text-orange-400">⚡ Struck by lightning & snapped in two. Suspicious patterns found.</div>
    </div>
  );
  const edge = (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#120600" strokeWidth={16} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <motion.polyline points={pts} fill="none" stroke="#e0662a" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 2px #ff8a3d99)" }}
        animate={reduce ? { opacity: 0.85 } : { opacity: [0.55, 0.9, 0.62, 0.8, 0.55] }} transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.45, 0.7, 1] }} />
    </svg>
  );
  // anticipation: halves bend INTO the crack (card buckles) before snapping apart; underdamped springs
  // with different mass/stiffness per half give an unsynchronised wobble that settles
  const half = (P: [number, number][], tgt: { x: number; y: number; rotate: number }, origin: string, side: -1 | 1) => (
    <motion.div className="pointer-events-none absolute inset-0 z-20" style={{ transformOrigin: origin, willChange: "transform" }}
      initial={reduce ? tgt : { x: 0, y: 0, rotate: 0 }}
      animate={split ? tgt : ph === "crack" ? { x: -side * 1.5, y: 2.5, rotate: side * 0.9, scaleY: 0.992 } : { x: 0, y: 0, rotate: 0 }}
      transition={reduce ? { duration: 0 } : split
        ? { type: "spring", stiffness: side < 0 ? 85 : 100, damping: side < 0 ? 13 : 15, mass: side < 0 ? 1.25 : 1, delay: side < 0 ? 0 : jr.d, restDelta: 0.001 }
        : { duration: 0.75, ease: [0.4, 0, 0.6, 1] }}>
      <div className="absolute inset-0" style={{ clipPath: clip(P), WebkitClipPath: clip(P) }}>
        {face}
        {cracked && edge}
      </div>
    </motion.div>
  );
  const gap = compact ? 10 : 22;
  return (
    <motion.div key={run} className={`card relative border-transparent bg-transparent ${split ? "overflow-visible mb-4" : "overflow-hidden"}`}
      initial={{ opacity: 0 }}
      animate={reduce ? { opacity: 1 } : ph === "hit" ? { opacity: 1, ...hs } : ph === "stamp" ? { opacity: 1, ...ss } : { opacity: 1, x: 0, y: 0, rotate: 0 }}
      transition={ph === "stamp" ? { duration: 0.5, delay: 0.1, ease: EASE_OUT } : { duration: 0.5, ease: EASE_OUT }} style={{ boxShadow: "none" }}>
      {replay}
      {/* layout sizer */}
      <div className="invisible"><CoinFace r={r} compact={compact} /><div className="px-4 pb-3 text-xs">.</div></div>
      {/* scorched gap behind the break */}
      <motion.div className="absolute inset-0 z-0 rounded-2xl" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: split ? 1 : 0 }} transition={{ duration: 0.5 }}
        style={{ background: "radial-gradient(ellipse at 50% 55%, #3a1205 0%, #0b0d0c 65%)", boxShadow: "inset 0 0 50px #ff3b1f66" }} />
      {half(leftPoly, { x: -gap * 0.6, y: gap * jr.ly, rotate: jr.l }, `${line[line.length - 1][0]}% 100%`, -1)}
      {half(rightPoly, { x: gap * 0.55, y: gap * jr.ry, rotate: jr.rr }, `${line[line.length - 1][0]}% 100%`, 1)}
      {!reduce && (
        <>
          <motion.div className="pointer-events-none fixed inset-0 z-[60] bg-[#fffaf0]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.24, 0.02, 0.1, 0] }} transition={{ duration: 0.6, delay: 0.08, times: [0, 0.05, 0.22, 0.32, 1] }} />
          <motion.div className="pointer-events-none absolute -top-6 z-40 h-[110%] w-20" style={{ left: `${line[0][0] - 6}%` }} initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: [0, 1, 0.15, 0.9, 0], clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)"] }} transition={{ duration: 0.6, delay: 0.04, times: [0, 0.12, 0.3, 0.42, 1] }}>
            <Bolt className="h-full w-full" seed={seed ^ 3} />
          </motion.div>
          {cracked && (
            <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.polyline points={pts} fill="none" stroke="#fff7e0" strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 3px #ffb35c88)" }}
                initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: split ? 0 : 0.95 }} transition={{ pathLength: { duration: 0.55, ease: [0.2, 0.6, 0.35, 1] }, opacity: { duration: 0.25 } }} />
            </svg>
          )}
          {cracked && <SeamArcs seams={[line]} seed={seed} dur={0.7} delay={0.1} repeat={1} />}
          {cracked && <Embers origins={line} count={compact ? 45 : 95} delay={850} duration={2400} />}
          {split && <Sparks n={compact ? 6 : 12} color="#FB923C" />}
        </>
      )}
      {ph === "stamp" && (
        <motion.div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
          initial={reduce ? { opacity: 1 } : { scale: 1.3, opacity: 0, y: -6 }} animate={{ scale: [null, 0.985, 1], opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { scale: { duration: 0.52, times: [0, 0.55, 1], ease: [EASE_IN, EASE_OUT] }, opacity: { duration: 0.2 }, y: { duration: 0.3, ease: EASE_IN } }}>
          {!reduce && <motion.div className="absolute h-28 w-48 rounded-[45%] border-2 border-orange-500/60" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 2.2, opacity: [0, 0.55, 0] }} transition={{ duration: 0.75, delay: 0.2, ease: EASE_OUT }} />}
          <Stamp seed={seed} color="#e8732c" compact={compact} />
        </motion.div>
      )}
    </motion.div>
  );
}
