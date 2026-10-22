"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Gate from "@/components/Gate";
import { ipfs, scoreColor, usd } from "@/lib/format";
import { TokenLogo } from "@/components/TokenLogo";

type Theme = { key: string; label: string; emoji: string; count: number; totalMcap: number; avgScore: number | null; scoredSample: number; top: { mint: string; name: string; symbol: string; image?: string; mcap?: number; score: number | null }[] };

function Radar() {
  const [d, setD] = useState<{ totalCoins: number; themes: Theme[]; sources: Record<string, boolean> } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetch("/api/meta").then((r) => r.json()).then(setD).catch((e) => setErr(String(e))); }, []);
  const max = Math.max(1, ...(d?.themes.map((t) => t.count) ?? [1]));
  return (
    <div>
      <h1 className="text-3xl font-black">Meta <span className="text-volt">Radar</span></h1>
      <p className="mb-4 text-gray-400">Recent + movers + graduated pump.fun coins grouped into themes by keyword rules. Avg score sampled from the biggest coins per theme.</p>
      {err && <div className="text-red-400">{err}</div>}
      {!d && !err && <div className="text-pump">⚡ Scanning pump.fun & scoring samples (~20-40s)…</div>}
      {d && (
        <>
          <div className="mb-4 text-xs text-gray-500">{d.totalCoins} coins · sources: {Object.entries(d.sources).map(([k, v]) => `${k} ${v ? "✓" : "✕"}`).join(" · ")}</div>
          <div className="grid gap-4 md:grid-cols-2">
            {d.themes.map((t, i) => (
              <motion.div key={t.key} className="card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: Math.min(i, 10) * 0.04 }}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="flex-1 text-lg font-black">{t.label}</span>
                  <span className="text-sm text-gray-400">{t.count} coins · {usd(t.totalMcap)}</span>
                  {t.avgScore != null && <span className="rounded px-2 py-0.5 text-sm font-black text-coal-950" style={{ background: scoreColor(t.avgScore) }} title={`avg of ${t.scoredSample} scored`}>{t.avgScore}</span>}
                </div>
                <div className="mt-2 h-2 rounded-full bg-coal-700"><motion.div className="h-full rounded-full bg-gradient-to-r from-pump to-volt" initial={{ width: 0 }} animate={{ width: `${(t.count / max) * 100}%` }} /></div>
                <div className="mt-3 space-y-1">
                  {t.top.map((c) => (
                    <Link key={c.mint} href={`/?mint=${c.mint}`} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-coal-800">
                      <TokenLogo mint={c.mint} image={c.image} label={c.symbol} className="h-6 w-6 shrink-0 rounded" />
                      <span className="flex-1 truncate">{c.name} <span className="text-pump">${c.symbol}</span></span>
                      <span className="text-gray-500">{usd(c.mcap)}</span>
                      {c.score != null && <span className="font-bold" style={{ color: scoreColor(c.score) }}>{c.score}</span>}
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
export default function Page() { return <Gate need="Scout"><Radar /></Gate>; }
