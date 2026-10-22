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
  // fractal midpoint displacement: big wanders + small chips, uneven spacing — reads hand-broken, not zigzag
  const depth = Math.max(2, Math.ceil(Math.log2(n)) + 1);
  let pts: P[] = [a, b]; let A = amp * (0.7 + r() * 0.6);
  for (let d = 0; d < depth; d++) {
    const nxt: P[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1]; const dx = q[0] - p[0], dy = q[1] - p[1]; const L = Math.hypot(dx, dy) || 1;
      const t = 0.5 + (r() - 0.5) * 0.45; const o = (r() - 0.5) * 2 * A * (r() < 0.18 ? 1.8 : 1);
      nxt.push([p[0] + dx * t - (dy / L) * o, p[1] + dy * t + (dx / L) * o], q);
    }
    pts = nxt; A *= 0.48 + r() * 0.14;
  }
  return pts.slice(1, -1);
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
  // mass varies per shard: big pieces lumber, small chips zip; quadratic air drag; spin bleeds off
  const mass = 0.6 + r() * 0.9;
  const power = (300 + r() * 380) / Math.sqrt(mass);
  let vx = (dx / d) * power + (r() - 0.5) * 160, vy = (dy / d) * power * 0.6 - 200 - r() * 240;
  const g = 1350, T = 1.4 + r() * 0.7, N = 30; let spin = (r() - 0.5) * 760 / mass; const k = 0.0011 / mass;
  const x: number[] = [0], y: number[] = [0], rot: number[] = [0], op: number[] = [1], times: number[] = [0];
  let px = 0, py = 0, pr = 0; const dt = T / N; const fadeAt = 0.5 + r() * 0.2;
  for (let i = 1; i <= N; i++) {
    const sp = Math.hypot(vx, vy); vx -= vx * sp * k * dt; vy += (g - vy * sp * k) * dt;
    px += vx * dt; py += vy * dt; pr += spin * dt; spin *= 0.985;
    times.push(i / N); x.push(px * (w / 600)); y.push(py * (h / 440)); rot.push(pr);
    const f = i / N; op.push(f < fadeAt ? 1 : Math.pow(1 - (f - fadeAt) / (1 - fadeAt), 1.6));
  }
  return { x, y, rot, op, times, T, rx: (r() - 0.5) * 110, delay: r() * 0.07 };
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
  const variants = useMemo(() => { const r = rng(seed ^ 0x9e37); return [0, 1, 2].map(() => seams.filter(() => seams.length < 3 || r() < 0.38).map((s) => arcPath(s, r))); }, [seams, seed]);
  const flick = useMemo(() => { const r = rng(seed ^ 0x77); return [0, 1, 2].map(() => {
    const n = 6 + ((r() * 4) | 0); const t = [0]; for (let i = 1; i < n; i++) t.push(t[i - 1] + 0.3 + r()); const m = t[n - 1];
    return { times: t.map((v) => v / m), op: t.map((_, i) => (i === 0 || i === n - 1 ? 0 : r() < 0.4 ? 0 : 0.35 + r() * 0.65)), d: dur * (0.75 + r() * 0.5), dl: r() * 0.12 }; }); }, [seed, dur]);
  return (
    <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ mixBlendMode: "screen" }}>
      <defs>
        <filter id={`glow${seed}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {variants.map((paths, vi) => (
        <motion.g key={vi} filter={`url(#glow${seed})`} initial={{ opacity: 0 }}
          animate={{ opacity: flick[vi].op }} transition={{ duration: flick[vi].d, delay: delay + flick[vi].dl, repeat, repeatDelay: 0.35 + vi * 0.21, times: flick[vi].times, ease: "easeOut" }}>
          {paths.map((d, i) => (
            <g key={i}>
              <path d={d} stroke={vi === 1 ? "#f5d76e" : "#a8d8ff"} strokeWidth={vi === 1 ? 1.6 : 2.2} fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={0.5} />
              <path d={d} stroke="#fffdf4" strokeWidth={vi === 2 ? 0.6 : 0.9} fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
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
    const cols = ["#FFE7A3", "#FFC861", "#FF9A3C", "#F2672A", "#fff4d6"];
    // log-normal-ish sizes, per-particle drag & lifetime: a few big slow embers, many tiny fast sparks
    const ps = Array.from({ length: count }, (_, i) => { const o = origins[i % origins.length]; const a = Math.random() * Math.PI * 2; const spark = Math.random() < 0.55;
      const sp = (spark ? 3 + Math.random() ** 0.6 * 11 : 0.6 + Math.random() * 3.5) * dpr * 60;
      return { x: (o[0] / 100) * W() + (Math.random() - 0.5) * 6 * dpr, y: (o[1] / 100) * Hh() + (Math.random() - 0.5) * 6 * dpr, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (spark ? 120 : 40) * dpr,
        life: 0, max: spark ? 0.35 + Math.random() * 0.9 : 0.9 + Math.random() * 1.8, born: Math.random() ** 2 * 0.35, drag: spark ? 2.2 + Math.random() * 2 : 1 + Math.random(),
        sz: Math.exp(Math.random() * 1.3 - 0.4) * dpr, c: cols[(Math.random() * cols.length) | 0], spark, ph: Math.random() * 6.28, wob: 0.5 + Math.random() * 2 }; });
    let last = 0;
    const tick = (ts: number) => {
      if (!start) { start = ts; last = ts; } const el = ts - start; const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W(), Hh());
      if (el >= delay) { ctx.globalCompositeOperation = "lighter"; let alive = 0; const tt = (el - delay) / 1000;
        for (const p of ps) { if (tt < p.born) { alive++; continue; } if (p.life > p.max) continue; alive++; p.life += dt;
          const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy = p.vy * dr + (p.spark ? 520 : 60) * dpr * dt;
          if (!p.spark) { p.vy -= 110 * dpr * dt; p.vx += Math.sin(p.life * 4 * p.wob + p.ph) * 30 * dpr * dt; }
          p.x += p.vx * dt; p.y += p.vy * dt; const f = p.life / p.max; const a = (1 - f) * (1 - f) * (p.spark ? 1 : 0.55 + 0.45 * Math.sin(p.life * 17 + p.ph) ** 2);
          ctx.globalAlpha = a; ctx.strokeStyle = p.c; ctx.fillStyle = p.c;
          if (p.spark) { ctx.lineCap = "round"; ctx.lineWidth = p.sz * 0.8; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); ctx.stroke(); }
          else { const rr = p.sz * (0.7 + (1 - f) * 0.5); ctx.globalAlpha = a * 0.12; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 2.4, 0, 7); ctx.fill(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill(); } }
        if (!alive || el > delay + duration) { ctx.clearRect(0, 0, W(), Hh()); return; } }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [origins, count, delay, duration]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-40 h-full w-full" />;
}

/** single jagged diagonal break from top edge to bottom edge (% coords) */
export function crackLine(seed: number): P[] {
  const r = rng(seed ^ 0xc4ac);
  const a: P = [54 + r() * 14, 0], b: P = [30 + r() * 14, 100];
  return [a, ...jag(a, b, r, 14, 7), b];
}

/** seeded hand-drawn lightning bolt path (viewBox 0 0 100 300) with a side fork */
export function boltPath(seed: number) {
  const r = rng(seed ^ 0xb017); let x = 50 + (r() - 0.5) * 20, y = 0; const main: P[] = [[x, y]]; const forks: P[][] = [];
  while (y < 300) { y += 14 + r() * 34; x += (r() - 0.5) * 34; x = Math.max(12, Math.min(88, x)); main.push([x, Math.min(y, 300)]);
    if (r() < 0.22 && y < 230) { let fx = x, fy = y; const f: P[] = [[fx, fy]]; const dir = r() < 0.5 ? -1 : 1; for (let i = 0; i < 3; i++) { fx += dir * (6 + r() * 12); fy += 12 + r() * 20; f.push([fx, fy]); } forks.push(f); } }
  const d = (pts: P[]) => "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L");
  return { main: d(main), forks: forks.map(d) };
}
