"use client";
import HeroMascot from "@/components/HeroMascot";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Reaction from "@/components/Reaction";
import Factors from "@/components/Factors";
import { useScore } from "@/lib/useScore";
import { addWatch, loadWatch } from "@/lib/watchlist";

const EXAMPLES = [
  ["ConConAI", "vhwXsEdCRDBLQ1BwELSMhA5oRXQF9u4UuDBHc6Hpump"],
  ["CRAWLNET", "BXoHJddsWJLHtAopeiSbKUSELsu8hSFMs8baGMDkpump"],
];

function Scanner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [mint, setMint] = useState(sp.get("mint") ?? "");
  const { data, error, loading, run } = useScore();
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    const m = sp.get("mint");
    if (m) { setMint(m); run(m); }
  }, [sp, run]);
  useEffect(() => { if (data) setWatched(loadWatch().some((w) => w.mint === data.mint)); }, [data]);

  const go = (m = mint) => { if (m.trim()) router.replace(`/?mint=${m.trim()}`); };

  return (
    <div className="space-y-6">
      <section className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Paste a mint. <span className="text-pump">PokeSnap</span> sniffs it. <span className="text-volt">Bad coins get zapped.</span>
          </h1>
          <p className="mt-2 text-gray-400">0-100 risk score from live pump.fun, DexScreener, RugCheck & Solana RPC data — with evidence for every point.</p>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); go(); }}>
            <input className="input" placeholder="Solana mint address, e.g. …pump" value={mint} onChange={(e) => setMint(e.target.value)} />
            <button className="btn-neon whitespace-nowrap" disabled={loading}>{loading ? "Sniffing…" : "⚡ Snap it"}</button>
          </form>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            Try:
            {EXAMPLES.map(([n, m]) => <button key={m} className="text-pump hover:underline" onClick={() => { setMint(m); go(m); }}>{n}</button>)}
          </div>
        </div>
        <HeroMascot mood={loading ? "scan" : data ? (data.score < 25 ? "angry" : data.score >= 70 ? "happy" : "idle") : "idle"} />
      </section>

      {loading && (
        <div className="card flex items-center gap-3 p-6 text-pump">
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>⚡</motion.span>
          Sniffing holders, dev wallet, liquidity, authorities, insiders…
        </div>
      )}
      {error && <div className="card border-red-500/50 p-4 text-red-400">⚠️ {error}</div>}
      {data && !loading && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]" id="result">
          <div className="space-y-3">
            <Reaction r={data} />
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost text-sm" onClick={() => run(data.mint, true)}>↻ Re-score (fresh)</button>
              <button className="btn-ghost text-sm" disabled={watched} onClick={() => { addWatch({ mint: data.mint, name: data.name, symbol: data.symbol, addedAt: Date.now(), devPctAtAdd: data.metrics.devPct, lastDevPct: data.metrics.devPct, lastScore: data.score, lastCheckedAt: Date.now() }); setWatched(true); }}>
                {watched ? "✓ In Dev Watch" : "+ Dev Watch"}
              </button>
              <code className="self-center truncate text-xs text-gray-500">{data.mint}</code>
            </div>
            {data.reasons.length > 0 && (
              <div className="card p-4">
                <h3 className="mb-2 font-black text-volt">Why?</h3>
                <ul className="space-y-1 text-sm text-gray-300">{data.reasons.map((x, i) => <li key={i}>⚡ {x}</li>)}</ul>
              </div>
            )}
          </div>
          <Factors r={data} />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense><Scanner /></Suspense>;
}
