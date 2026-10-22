"use client";
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Mood = "idle" | "scan" | "angry" | "happy";

export default function HeroMascot({ mood = "idle" }: { mood?: Mood }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 14, mass: 0.8 });
  const sy = useSpring(my, { stiffness: 120, damping: 14, mass: 0.8 });
  const rotY = useTransform(sx, [-1, 1], [-9, 9]);
  const rotX = useTransform(sy, [-1, 1], [6, -6]);
  const breath = useMotionValue(1);
  const floatY = useMotionValue(0);
  const shadowS = useTransform(floatY, [-10, 4], [0.78, 1.04]);
  const shadowO = useTransform(floatY, [-10, 4], [0.28, 0.5]);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; r: number }[]>([]);
  const hop = useSpring(0, { stiffness: 260, damping: 11 });

  // organic idle: chained tweens with randomized timing instead of a fixed loop
  useEffect(() => {
    let alive = true;
    const loopB = async () => { while (alive) { const d = 2.6 + Math.random() * 1.4;
      await animate(breath, 1.018 + Math.random() * 0.01, { duration: d * 0.45, ease: [0.37, 0, 0.63, 1] });
      await animate(breath, 1, { duration: d * 0.55, ease: [0.37, 0, 0.63, 1] }); } };
    const loopF = async () => { while (alive) {
      await animate(floatY, -5 - Math.random() * 5, { duration: 2.2 + Math.random() * 1.5, ease: [0.45, 0, 0.55, 1] });
      await animate(floatY, Math.random() * 2, { duration: 2 + Math.random() * 1.5, ease: [0.45, 0, 0.55, 1] }); } };
    loopB(); loopF();
    let t: ReturnType<typeof setTimeout>;
    const spark = () => { if (!alive) return;
      const id = Date.now();
      setSparks((s) => [...s.slice(-3), { id, x: 25 + Math.random() * 50, y: 20 + Math.random() * 30, r: Math.random() * 360 }]);
      t = setTimeout(spark, 1400 + Math.random() * 3200); };
    t = setTimeout(spark, 1200);
    return () => { alive = false; clearTimeout(t); };
  }, [breath, floatY]);

  useEffect(() => { if (mood === "angry" || mood === "happy") { hop.set(mood === "angry" ? -18 : -12); setTimeout(() => hop.set(0), 140); } }, [mood, hop]);
  const hopY = useTransform([floatY, hop] as any, ([a, b]: number[]) => a + b);

  const onMove = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1); };
  const src = mood === "angry" || mood === "scan" ? "/mascot-attack.webp" : "/mascot-calm.webp";

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={() => { mx.set(0); my.set(0); }}
      className="relative hidden h-56 w-60 select-none md:block" style={{ perspective: 700 }}>
      {/* faint ground glow + contact shadow */}
      <motion.div className="absolute bottom-1 left-1/2 h-5 w-40 -translate-x-1/2 rounded-[50%]"
        style={{ scaleX: shadowS, opacity: shadowO, background: "radial-gradient(closest-side, rgba(0,0,0,.85), transparent)" }} />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-16 w-56 -translate-x-1/2 rounded-[50%] opacity-40 blur-2xl"
        style={{ background: "radial-gradient(closest-side, rgba(134,239,90,.35), transparent)" }} />
      <motion.div className="absolute inset-0 flex items-end justify-center pb-3"
        style={{ y: hopY, rotateX: rotX, rotateY: rotY, scale: breath, transformOrigin: "50% 90%" }}
        whileHover={{ scale: 1.04, transition: { type: "spring", stiffness: 300, damping: 12 } }}
        whileTap={{ scale: 0.96, rotate: -3 }}>
        <motion.img key={src} src={src} alt="PokeSnap mascot" draggable={false}
          initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1, rotate: mood === "scan" ? [0, -1.5, 1.2, 0] : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 16, rotate: { duration: 0.9, repeat: mood === "scan" ? Infinity : 0, repeatDelay: 0.3 } }}
          className="h-full w-auto object-contain"
          style={{ filter: "drop-shadow(0 10px 18px rgba(0,0,0,.55)) drop-shadow(0 0 10px rgba(163,230,53,.12))" }} />
        {sparks.map((s) => (
          <motion.svg key={s.id} viewBox="0 0 20 20" className="pointer-events-none absolute h-4 w-4"
            style={{ left: `${s.x}%`, top: `${s.y}%`, rotate: s.r }}
            initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 0.9, 0.2, 0.7, 0], scale: [0.4, 1, 0.9, 1.05, 0.8] }}
            transition={{ duration: 0.55, times: [0, 0.15, 0.35, 0.5, 1], ease: "easeOut" }}>
            <path d="M11 1 L5 11 H10 L8 19 L15 8 H10 Z" fill="#facc15" opacity=".85" />
          </motion.svg>
        ))}
      </motion.div>
    </div>
  );
}
