"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { POKESNAP_MINT } from "@/lib/tiers";

type B = { configured: boolean; initial?: number; current?: number; burned?: number; burnedPct?: number; error?: string; initialSource?: string };
const fmt = (n?: number) => (n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 0 }));

export default function Burn() {
  const [b, setB] = useState<B | null>(null);
  useEffect(() => { if (POKESNAP_MINT) fetch("/api/burn").then((r) => r.json()).then(setB); }, []);
  if (!POKESNAP_MINT) return <div className="card p-6 text-gray-400">Burn Tracker appears after launch (set NEXT_PUBLIC_POKESNAP_MINT).</div>;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-black">Burn <span className="text-volt">Tracker</span> 🔥</h1>
      {!b && <div className="text-pump">Reading supply from chain…</div>}
      {b?.error && <div className="text-red-400">⚠️ {b.error}</div>}
      {b && !b.error && (
        <div className="card mt-4 p-6">
          <div className="text-5xl font-black text-volt">{fmt(b.burned)}</div>
          <div className="text-gray-400">$PokeSnap burned ({b.burnedPct?.toFixed(3)}% of supply)</div>
          <div className="mt-4 h-4 overflow-hidden rounded-full bg-coal-700">
            <motion.div className="h-full bg-gradient-to-r from-volt to-red-500" initial={{ width: 0 }} animate={{ width: `${Math.max(0.5, b.burnedPct ?? 0)}%` }} transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-gray-500">Initial supply</div><b>{fmt(b.initial)}</b></div>
            <div><div className="text-gray-500">Current supply (RPC)</div><b>{fmt(b.current)}</b></div>
          </div>
          <div className="mt-2 text-xs text-gray-600">Initial: {b.initialSource}</div>
        </div>
      )}
    </div>
  );
}
