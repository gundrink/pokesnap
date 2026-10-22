"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ShameEntry } from "@/lib/store";
import { ago, ipfs, usd } from "@/lib/format";

export default function Shame() {
  const [list, setList] = useState<ShameEntry[] | null>(null);
  useEffect(() => { fetch("/api/shame").then((r) => r.json()).then((j) => setList(j.entries)); }, []);
  return (
    <div>
      <h1 className="text-3xl font-black">Hall of <span className="text-red-500">Shame</span></h1>
      <p className="mb-4 text-gray-400">Every coin that scored below 25 gets ZAPPED and burned in here (stored in data/hall-of-shame.json).</p>
      {list && !list.length && <div className="card p-6 text-gray-400">No zapped coins yet. Scan some coins or open the Live Arena — anything under 25 lands here.</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list?.map((e, i) => (
          <motion.div key={e.mint} className="card scorched relative overflow-hidden border-red-900 p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: Math.min(i, 10) * 0.035 }}>
            <div className="absolute right-2 top-3 rotate-12 rounded border-2 border-red-500 px-2 text-sm font-black tracking-widest text-red-500">ZAPPED</div>
            <div className="flex items-center gap-3">
              {e.image ? <img src={ipfs(e.image)} alt="" className="h-12 w-12 rounded-lg object-cover grayscale" /> : <div className="h-12 w-12 rounded-lg bg-coal-700" />}
              <div>
                <div className="font-black">{e.name} <span className="text-pump">${e.symbol}</span></div>
                <div className="text-sm text-red-400">score {e.score} · {usd(e.marketCapUsd)}</div>
              </div>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-gray-300">{e.reasons.slice(0, 3).map((r, j) => <li key={j}>🔥 {r}</li>)}</ul>
            <div className="mt-2 flex justify-between text-[11px] text-gray-500">
              <span>zapped {ago(e.firstZappedAt)} · ×{e.timesZapped}</span>
              <Link href={`/?mint=${e.mint}`} className="text-pump">re-scan →</Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
