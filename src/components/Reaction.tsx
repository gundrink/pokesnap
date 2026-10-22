"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Embers, SeamArcs, buildShards, crackLine, flight, hash, rng } from "./Shatter";
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

export default function Reaction({ r, compact = false }: { r: ScoreResult; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("attack");
  const reduce = useReducedMotion();
  const seed = useMemo(() => hash(r.mint + ":" + run), [r.mint, run]);
  const crack = useMemo(() => buildShards(seed, 2, 1).seams, [seed]);
  useEffect(() => {
    if (r.level !== "danger") return;
    if (reduce) { setPhase("stamp"); return; }
    setPhase("attack");
    const a = compact ? 1200 : 2600;
    const ts = [setTimeout(() => setPhase("strike"), a), setTimeout(() => setPhase("shatter"), a + 450), setTimeout(() => setPhase("stamp"), a + 1500)];
    return () => ts.forEach(clearTimeout);
  }, [r.mint, r.level, run, compact, reduce]);

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
  const face = (
    <div className="absolute inset-0 rounded-2xl bg-coal-900">
      <CoinFace r={r} compact={compact} />
      <div className="px-4 text-[11px] leading-snug text-red-300/90">{r.reasons.slice(0, 4).map((x) => <div key={x}>✖ {x}</div>)}</div>
    </div>
  );
  return (
    <motion.div key={run} ref={box}
      className={`card relative border-red-500/70 shadow-danger ${flew ? "overflow-visible" : "overflow-hidden"} ${compact ? "min-h-[230px]" : "min-h-[440px]"}`}
      animate={phase === "strike" ? { x: [0, -14, 12, -10, 9, -6, 4, 0], y: [0, 8, -9, 6, -5, 3, 0], rotate: [0, -1.2, 1, -0.8, 0.5, 0] }
        : phase === "stamp" && !reduce ? { x: [0, 0, -6, 5, -3, 0], y: [0, 0, 7, -4, 2, 0] } : { x: 0, y: 0 }}
      transition={phase === "stamp" ? { duration: 0.5, delay: 0.12 } : { duration: 0.45 }}
      style={{ willChange: "transform" }}>
      {replay}
      <AnimatePresence>
        {phase === "attack" && (
          <motion.div key="attack" className="absolute inset-0 overflow-hidden rounded-2xl" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <motion.div className="absolute inset-0 opacity-60" animate={{ x: [0, -8, 8, -8, 8, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>{face}</motion.div>
            {compact ? (
              <motion.img src="/mascot-attack.jpg" className="absolute inset-0 z-20 h-full w-full object-cover" initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 0.95 }} transition={{ duration: 0.35 }} alt="" />
            ) : (
              <motion.video src="/mascot-attack.mp4" poster="/mascot-attack.jpg" autoPlay muted playsInline className="absolute inset-0 z-20 h-full w-full object-cover"
                initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} />
            )}
            <motion.div className="pointer-events-none absolute inset-0 z-30 bg-volt mix-blend-screen" animate={{ opacity: [0, 0.7, 0, 0.5, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.6 }} />
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
                animate={flew && !reduce ? { x: f.x, y: f.y, rotate: f.rot, rotateX: f.rx, opacity: f.op } : phase === "strike" ? { x: (s.cx - 50) * 0.08, y: (s.cy - 50) * 0.08, scale: 1.01 } : { opacity: 0.25 }}
                transition={flew && !reduce ? { duration: f.T, times: f.times, ease: "linear" } : { duration: 0.2 }}>
                <div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip }}>
                  {face}
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points={s.poly.map((p) => p.join(",")).join(" ")} fill="none" stroke="#120600" strokeWidth={14} vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={0.95} />
                    <polygon points={s.poly.map((p) => p.join(",")).join(" ")} fill="none" stroke="#ff6a1f" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={0.9} />
                  </svg>
                  <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: flew ? 0.55 : 0.2 }} transition={{ duration: 0.8 }}
                    style={{ background: "radial-gradient(circle at 50% 50%, transparent 30%, #1a0a00cc 100%)" }} />
                </div>
              </motion.div>
            );
          })}
          {!reduce && <SeamArcs seams={seams} seed={seed} dur={phase === "strike" ? 0.45 : 0.6} />}
          {/* lightning bolt + white flash */}
          {!reduce && (
            <>
              <motion.div className="pointer-events-none absolute -top-6 left-[38%] z-40 h-[110%] w-24" initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: [0, 1, 1, 0], scaleY: [0, 1, 1, 1] }} transition={{ duration: 0.5 }} style={{ originY: 0 }}>
                <Bolt className="h-full w-full" />
              </motion.div>
              <motion.div className="pointer-events-none fixed inset-0 z-[60] bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.95, 0, 0.6, 0] }} transition={{ duration: 0.45, times: [0, 0.08, 0.3, 0.42, 1] }} />
              <motion.div className="pointer-events-none absolute inset-0 z-10 rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4] }} transition={{ duration: 0.6 }}
                style={{ background: "radial-gradient(circle at 50% 50%, #00ff8855, #FACC1522 40%, transparent 70%)" }} />
              <Embers origins={origins} count={compact ? 90 : 220} delay={350} duration={3000} />
            </>
          )}
          {/* scorched void where card was */}
          <motion.div className="absolute inset-0 z-0 rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: flew ? 1 : 0 }} transition={{ duration: 0.6 }}
            style={{ background: "radial-gradient(ellipse at 50% 60%, #2a0d05 0%, #0b0d0c 70%)", boxShadow: "inset 0 0 60px #ff3b1f55" }} />
          {phase === "stamp" && (
            <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center"
              initial={reduce ? { opacity: 1, rotate: -12 } : { scale: 4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{ type: "spring", stiffness: 520, damping: 18, mass: 0.9 }}>
              {!reduce && <motion.div className="absolute h-40 w-40 rounded-full border-4 border-red-500" initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ duration: 0.7, delay: 0.12 }} />}
              <div className={`relative rounded-lg border-[6px] border-red-500 bg-coal-950/70 px-6 py-1 font-black tracking-[0.25em] text-red-500 ${compact ? "text-3xl" : "text-7xl"}`}
                style={{ textShadow: "0 0 24px #EF4444, 0 0 4px #fff", boxShadow: "0 0 40px #EF444488, inset 0 0 20px #EF444455", maskImage: "radial-gradient(circle at 30% 40%, #000 60%, #000a 75%, #000 90%)" }}>ZAPPED</div>
              <div className="mt-4 rotate-12 rounded bg-coal-950/90 px-3 py-1 text-center">
                <div className="font-black">{r.name} <span className="text-pump">${r.symbol}</span></div>
                <div className="text-sm text-red-400">score {r.score}/100</div>
              </div>
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
    const ts = [setTimeout(() => setPh("crack"), 350), setTimeout(() => setPh("split"), 1150), setTimeout(() => setPh("stamp"), 1900)];
    return () => ts.forEach(clearTimeout);
  }, [run, reduce, r.mint]);
  const line = useMemo(() => crackLine(seed), [seed]);
  const pts = line.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const leftPoly = [[0, 0], ...line, [0, 100]] as [number, number][];
  const rightPoly = [...line, [100, 100], [100, 0]] as [number, number][];
  const clip = (P: [number, number][]) => `polygon(${P.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(",")})`;
  const split = ph === "split" || ph === "stamp";
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
      <motion.polyline points={pts} fill="none" stroke="#ff6a1f" strokeWidth={4} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 4px #ff6a1f) drop-shadow(0 0 10px #FACC15)" }}
        animate={reduce ? { opacity: 0.9 } : { opacity: [0.6, 1, 0.7, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
    </svg>
  );
  const half = (P: [number, number][], tgt: { x: number; y: number; rotate: number }, origin: string) => (
    <motion.div className="pointer-events-none absolute inset-0 z-20" style={{ transformOrigin: origin, willChange: "transform" }}
      initial={reduce ? tgt : { x: 0, y: 0, rotate: 0 }}
      animate={split ? tgt : ph === "crack" ? { x: tgt.x * 0.08, y: 0, rotate: 0 } : { x: 0, y: 0, rotate: 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 11, mass: 1.1 }}>
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
      animate={reduce ? { opacity: 1 } : ph === "hit" ? { opacity: 1, x: [0, -5, 5, -3, 3, 0], y: [0, 3, -3, 2, 0] } : ph === "stamp" ? { opacity: 1, x: [0, -5, 4, -2, 0], y: [0, 6, -3, 1, 0] } : { opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.45 }} style={{ boxShadow: "none" }}>
      {replay}
      {/* layout sizer */}
      <div className="invisible"><CoinFace r={r} compact={compact} /><div className="px-4 pb-3 text-xs">.</div></div>
      {/* scorched gap behind the break */}
      <motion.div className="absolute inset-0 z-0 rounded-2xl" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: split ? 1 : 0 }} transition={{ duration: 0.5 }}
        style={{ background: "radial-gradient(ellipse at 50% 55%, #3a1205 0%, #0b0d0c 65%)", boxShadow: "inset 0 0 50px #ff3b1f66" }} />
      {half(leftPoly, { x: -gap * 0.6, y: gap * 0.35, rotate: -4 }, `${line[line.length - 1][0]}% 100%`)}
      {half(rightPoly, { x: gap * 0.6, y: gap * 0.15, rotate: 3.5 }, `${line[line.length - 1][0]}% 100%`)}
      {!reduce && (
        <>
          <motion.div className="pointer-events-none fixed inset-0 z-[60] bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0, 0.55, 0] }} transition={{ duration: 0.5, delay: 0.1 }} />
          <motion.div className="pointer-events-none absolute -top-6 z-40 h-[110%] w-20" style={{ left: `${line[0][0] - 6}%`, originY: 0 }} initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scaleY: [0, 1, 1, 1] }} transition={{ duration: 0.6, delay: 0.05 }}>
            <Bolt className="h-full w-full" />
          </motion.div>
          {cracked && (
            <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.polyline points={pts} fill="none" stroke="#fff" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 6px #FACC15) drop-shadow(0 0 12px #00ff88)" }}
                initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: split ? 0 : 1 }} transition={{ pathLength: { duration: 0.35 }, opacity: { duration: 0.2 } }} />
            </svg>
          )}
          {cracked && <SeamArcs seams={[line]} seed={seed} dur={0.7} delay={0.1} repeat={1} />}
          {cracked && <Embers origins={line} count={compact ? 50 : 110} delay={150} duration={2200} />}
          {split && <Sparks n={compact ? 6 : 12} color="#FB923C" />}
        </>
      )}
      {ph === "stamp" && (
        <motion.div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
          initial={reduce ? { opacity: 1, rotate: -12 } : { scale: 4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -12 }}
          transition={{ type: "spring", stiffness: 520, damping: 18, mass: 0.9 }}>
          {!reduce && <motion.div className="absolute h-32 w-32 rounded-full border-4 border-orange-500" initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.7, delay: 0.1 }} />}
          <div className={`relative rounded-lg border-[6px] border-orange-500 bg-coal-950/75 px-4 py-0.5 font-black tracking-[0.25em] text-orange-500 ${compact ? "text-2xl" : "text-5xl"}`}
            style={{ textShadow: "0 0 22px #FB923C, 0 0 4px #fff", boxShadow: "0 0 36px #FB923C88, inset 0 0 18px #FB923C55" }}>ZAPPED</div>
        </motion.div>
      )}
    </motion.div>
  );
}
