"use client";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

type P = [number, number];
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function hash(str: string) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

/** jagged path between a and b (excludes endpoints) */
function jag(a: P, b: P, r: () => number, n = 5, amp = 3.2): P[] {
  const out: P[] = []; const dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 1; i < n; i++) { const t = i / n + (r() - 0.5) * 0.08; const o = (r() - 0.5) * 2 * amp; out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]); }
  return out;
}

export type Shard = { poly: P[]; cx: number; cy: number };
export function buildShards(seed: number, cols: number, rows: number) {
  const r = rng(seed);
  const V: P[][] = [];
  for (let i = 0; i <= cols; i++) { V[i] = []; for (let j = 0; j <= rows; j++) {
    const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
    V[i][j] = [(i / cols) * 100 + (edgeX ? 0 : (r() - 0.5) * (70 / cols)), (j / rows) * 100 + (edgeY ? 0 : (r() - 0.5) * (70 / rows))];
  } }
  const H = new Map<string, P[]>(); const seams: P[][] = [];
  const edge = (a: [number, number], b: [number, number]) => {
    const k = `${a}|${b}`; if (!H.has(k)) {
      const pa = V[a[0]][a[1]], pb = V[b[0]][b[1]];
      const border = (a[0] === b[0] && (a[0] === 0 || a[0] === cols)) || (a[1] === b[1] && (a[1] === 0 || a[1] === rows));
      const mid = border ? [] : jag(pa, pb, r);
      H.set(k, mid); if (!border) seams.push([pa, ...mid, pb]);
    } return H.get(k)!;
  };
  const shards: Shard[] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const top = edge([i, j], [i + 1, j]), right = edge([i + 1, j], [i + 1, j + 1]);
    const bottom = edge([i, j + 1], [i + 1, j + 1]), left = edge([i, j], [i, j + 1]);
    const poly: P[] = [V[i][j], ...top, V[i + 1][j], ...right, V[i + 1][j + 1], ...[...bottom].reverse(), V[i][j + 1], ...[...left].reverse()];
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    shards.push({ poly, cx, cy });
  }
  return { shards, seams };
}

/** projectile keyframes: x = vx t, y = vy t + g t²/2 */
export function flight(s: Shard, r: () => number, w: number, h: number) {
  const dx = s.cx - 50, dy = s.cy - 50; const d = Math.hypot(dx, dy) || 1;
  const power = 380 + r() * 420;
  const vx = (dx / d) * power + (r() - 0.5) * 120, vy = (dy / d) * power * 0.7 - 260 - r() * 260;
  const g = 1500, T = 1.5 + r() * 0.5, N = 12; const spin = (r() - 0.5) * 900;
  const x: number[] = [], y: number[] = [], rot: number[] = [], op: number[] = [], times: number[] = [];
  for (let k = 0; k <= N; k++) { const t = (k / N) * T; times.push(k / N);
    x.push(vx * t * (w / 600)); y.push((vy * t + 0.5 * g * t * t) * (h / 440)); rot.push(spin * t); op.push(k < N * 0.55 ? 1 : 1 - (k - N * 0.55) / (N * 0.45)); }
  return { x, y, rot, op, times, T, rx: (r() - 0.5) * 140 };
}

export function arcPath(pts: P[], r: () => number, amp = 1.4) {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; out.push(a);
    for (let k = 1; k < 3; k++) { const t = k / 3; out.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * amp * 2, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * amp * 2]); } }
  out.push(pts[pts.length - 1]);
  return "M" + out.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L");
}

/** Electric arcs crackling along seams — several pre-jittered variants flickered via opacity */
export function SeamArcs({ seams, seed, dur = 0.9, delay = 0, repeat = 0 }: { seams: P[][]; seed: number; dur?: number; delay?: number; repeat?: number }) {
  const variants = useMemo(() => { const r = rng(seed ^ 0x9e37); return [0, 1, 2].map(() => seams.map((s) => arcPath(s, r))); }, [seams, seed]);
  return (
    <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ mixBlendMode: "screen" }}>
      <defs>
        <filter id={`glow${seed}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {variants.map((paths, vi) => (
        <motion.g key={vi} filter={`url(#glow${seed})`} initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0, 0.9, 0, 1, 0] }} transition={{ duration: dur, delay: delay + vi * 0.06, repeat, repeatDelay: 0.5, times: [0, .1, .25, .4, .55, .75, 1] }}>
          {paths.map((d, i) => (
            <g key={i}>
              <path d={d} stroke={vi === 1 ? "#FACC15" : "#00ff88"} strokeWidth={vi === 1 ? 2.2 : 3.2} fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={0.85} />
              <path d={d} stroke="#ffffff" strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </g>
          ))}
        </motion.g>
      ))}
    </svg>
  );
}

/** Canvas ember / spark particles with gravity + drag. Bursts at given origins (% coords). */
export function Embers({ origins, count = 140, delay = 0, duration = 2600 }: { origins: P[]; count?: number; delay?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); let raf = 0; let start = 0;
    const resize = () => { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; }; resize();
    const W = () => cv.width, Hh = () => cv.height;
    const cols = ["#00ff88", "#FACC15", "#FFF7AE", "#FB923C", "#FF5A1F"];
    const ps = Array.from({ length: count }, (_, i) => { const o = origins[i % origins.length]; const a = Math.random() * Math.PI * 2; const sp = (2 + Math.random() * 9) * dpr;
      return { x: (o[0] / 100) * W(), y: (o[1] / 100) * Hh(), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3 * dpr, life: 0, max: 50 + Math.random() * 90, sz: (0.8 + Math.random() * 2.2) * dpr, c: cols[(Math.random() * cols.length) | 0], spark: Math.random() < 0.45 }; });
    const tick = (ts: number) => {
      if (!start) start = ts; const el = ts - start;
      ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W(), Hh());
      if (el >= delay) { ctx.globalCompositeOperation = "lighter"; let alive = 0;
        for (const p of ps) { if (p.life > p.max) continue; alive++; p.life++;
          p.vx *= 0.975; p.vy = p.vy * 0.975 + 0.22 * dpr; if (!p.spark) p.vy -= 0.12 * dpr; // embers float
          p.x += p.vx; p.y += p.vy; const a = 1 - p.life / p.max;
          ctx.globalAlpha = a; ctx.strokeStyle = p.c; ctx.fillStyle = p.c;
          if (p.spark) { ctx.lineWidth = p.sz * 0.7; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke(); }
          else { const rr = p.sz * (0.6 + a * 0.6); ctx.globalAlpha = a * 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 3, 0, 7); ctx.fill(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill(); } }
        if (!alive || el > delay + duration) { ctx.clearRect(0, 0, W(), Hh()); return; } }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [origins, count, delay, duration]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-40 h-full w-full" />;
}
