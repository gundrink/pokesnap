"use client";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Gate from "@/components/Gate";
import Reaction from "@/components/Reaction";
import type { ScoreResult } from "@/lib/score";

type Item = ScoreResult | { mint: string; name: string; symbol: string; error: string };

function Arena() {
  const [board, setBoard] = useState<"movers" | "recent" | "graduated">("movers");
  const [coins, setCoins] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [at, setAt] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/arena?board=${board}&limit=9`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setCoins(j.coins); setAt(j.at); setErr(null);
    } catch (e: any) { setErr(String(e?.message ?? e)); } finally { setLoading(false); }
  }, [board]);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-3xl font-black">Live <span className="text-pump">Arena</span> <span className="text-sm font-normal text-gray-500">auto-scored, refreshes every 60s</span></h1>
        {(["movers", "recent", "graduated"] as const).map((b) => (
          <button key={b} onClick={() => setBoard(b)} className={b === board ? "btn-neon text-sm" : "btn-ghost text-sm"}>{b}</button>
        ))}
        <button className="btn-ghost text-sm" onClick={load}>{loading ? "…" : "↻"}</button>
      </div>
      {err && <div className="card mb-4 border-red-500/50 p-3 text-red-400">⚠️ {err}</div>}
      {loading && !coins.length && <div className="text-pump">⚡ Scoring {board} coins (live, ~10-30s)…</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coins.map((c) => "error" in c ? (
          <div key={c.mint} className="card p-4 text-sm text-gray-400">{c.name} — could not score: {c.error}</div>
        ) : (
          <motion.div key={c.mint} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], layout: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } }}>
            <Reaction r={c} compact />
            <Link href={`/?mint=${c.mint}`} className="mt-1 block text-right text-xs text-pump hover:underline">full breakdown →</Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
export default function Page() { return <Gate need="Scout"><Arena /></Gate>; }
