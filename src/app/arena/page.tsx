"use client";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Gate from "@/components/Gate";
import Reaction from "@/components/Reaction";
import { TokenLogo } from "@/components/TokenLogo";
import { usd } from "@/lib/format";
import type { ScoreResult } from "@/lib/score";

type Base = { mint: string; name: string; symbol: string; image?: string; mcap?: number };
type Item = Base & { result?: ScoreResult; error?: string };

function Arena() {
  const [board, setBoard] = useState<"movers" | "recent" | "graduated">("movers");
  const [coins, setCoins] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const gen = useRef(0);
  const load = useCallback(async () => {
    const id = ++gen.current;
    setLoading(true);
    try {
      // 1) board list renders instantly
      const r = await fetch(`/api/arena?board=${board}&limit=9&list=1`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (id !== gen.current) return;
      setErr(null);
      setCoins((prev) => (j.coins as Base[]).map((c) => ({ ...c, result: prev.find((p) => p.mint === c.mint)?.result })));
      // 2) scores fill in as each one lands (4 at a time)
      const list = [...(j.coins as Base[])];
      const worker = async () => {
        for (let c = list.shift(); c; c = list.shift()) {
          const mint = c.mint;
          try {
            const x = await fetch(`/api/score?mint=${mint}&light=1`);
            const d = await x.json();
            if (id !== gen.current) return;
            setCoins((cs) => cs.map((k) => (k.mint === mint ? (x.ok ? { ...k, result: d, error: undefined } : { ...k, error: d.error ?? `HTTP ${x.status}` }) : k)));
          } catch (e: any) {
            if (id === gen.current) setCoins((cs) => cs.map((k) => (k.mint === mint ? { ...k, error: String(e?.message ?? e) } : k)));
          }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
    } catch (e: any) { if (id === gen.current) setErr(String(e?.message ?? e)); } finally { if (id === gen.current) setLoading(false); }
  }, [board]);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-3xl font-black">Live <span className="text-pump">Arena</span> <span className="text-sm font-normal text-gray-500">auto-scored, refreshes every 60s</span></h1>
        {(["movers", "recent", "graduated"] as const).map((b) => (
          <button key={b} onClick={() => { setCoins([]); setBoard(b); }} className={b === board ? "btn-neon text-sm" : "btn-ghost text-sm"}>{b}</button>
        ))}
        <button className="btn-ghost text-sm" onClick={load}>{loading ? "…" : "↻"}</button>
      </div>
      {err && <div className="card mb-4 border-red-500/50 p-3 text-red-400">⚠️ {err}</div>}
      {loading && !coins.length && <div className="text-pump">⚡ Loading {board} board…</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coins.map((c) => (
          <motion.div key={c.mint} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], layout: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } }}>
            {c.result ? (
              <Reaction r={c.result} compact />
            ) : (
              <div className="card flex items-center gap-3 p-4">
                <TokenLogo mint={c.mint} image={c.image} label={c.symbol} className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{c.name} <span className="text-pump">${c.symbol}</span></div>
                  <div className="text-xs text-gray-500">{usd(c.mcap)} mcap</div>
                  <div className={`mt-1 text-xs ${c.error ? "text-red-400" : "text-volt"}`}>
                    {c.error ? `could not score: ${c.error}` : <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>⚡ scoring…</motion.span>}
                  </div>
                </div>
              </div>
            )}
            <Link href={`/?mint=${c.mint}`} className="mt-1 block text-right text-xs text-pump hover:underline">full breakdown →</Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
export default function Page() { return <Gate need="Scout"><Arena /></Gate>; }
