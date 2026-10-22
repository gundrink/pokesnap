"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Gate from "@/components/Gate";
import { loadWatch, saveWatch, type WatchItem } from "@/lib/watchlist";
import { isSolanaMint } from "@/lib/sources";
import { ago, pctf, scoreColor } from "@/lib/format";
import type { ScoreResult } from "@/lib/score";

function Watch() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [prev, setPrev] = useState<Record<string, WatchItem>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [add, setAdd] = useState("");

  const rescore = async (list: WatchItem[]) => {
    const before = Object.fromEntries(list.map((i) => [i.mint, { ...i }]));
    setPrev(before);
    for (const it of list) {
      setStatus((s) => ({ ...s, [it.mint]: "scoring…" }));
      try {
        const r = await fetch(`/api/score?mint=${it.mint}`);
        const j: ScoreResult = await r.json();
        if (!r.ok) throw new Error((j as any).error);
        const cur = loadWatch().map((x) => x.mint === it.mint ? { ...x, name: j.name, symbol: j.symbol, lastScore: j.score, lastDevPct: j.metrics.devPct, devPctAtAdd: x.devPctAtAdd ?? j.metrics.devPct, lastCheckedAt: Date.now() } : x);
        saveWatch(cur); setItems(cur);
        setStatus((s) => ({ ...s, [it.mint]: "" }));
      } catch (e: any) { setStatus((s) => ({ ...s, [it.mint]: `failed: ${e?.message}` })); }
    }
  };
  useEffect(() => { const l = loadWatch(); setItems(l); rescore(l); }, []);

  const addMint = () => {
    const m = add.trim();
    if (!isSolanaMint(m)) return;
    const l = [{ mint: m, name: "…", symbol: "…", addedAt: Date.now() }, ...loadWatch().filter((x) => x.mint !== m)];
    saveWatch(l); setItems(l); setAdd(""); rescore([l[0]]);
  };
  const remove = (m: string) => { const l = loadWatch().filter((x) => x.mint !== m); saveWatch(l); setItems(l); };

  return (
    <div>
      <h1 className="text-3xl font-black">Dev <span className="text-pump">Watch</span></h1>
      <p className="mb-4 text-gray-400">Your watchlist (stored in this browser). Every visit re-scores each coin and flags dev balance drops.</p>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); addMint(); }}>
        <input className="input" placeholder="Add mint to watch" value={add} onChange={(e) => setAdd(e.target.value)} />
        <button className="btn-neon">+ Watch</button>
      </form>
      {!items.length && <div className="card p-6 text-gray-400">Nothing watched yet. Add a mint here or press “+ Dev Watch” on a scan result.</div>}
      <div className="space-y-2">
        {items.map((it) => {
          const p = prev[it.mint];
          const devDrop = it.devPctAtAdd != null && it.lastDevPct != null && it.lastDevPct < it.devPctAtAdd - 0.01;
          const scoreDelta = p?.lastScore != null && it.lastScore != null ? it.lastScore - p.lastScore : 0;
          return (
            <div key={it.mint} className={`card flex flex-wrap items-center gap-3 p-3 ${devDrop ? "border-red-500/70 shadow-danger" : ""}`}>
              <div className="w-14 text-center text-2xl font-black" style={{ color: it.lastScore != null ? scoreColor(it.lastScore) : "#666" }}>{it.lastScore ?? "—"}</div>
              <div className="min-w-0 flex-1">
                <Link href={`/?mint=${it.mint}`} className="font-black hover:text-pump">{it.name} <span className="text-pump">${it.symbol}</span></Link>
                <div className="truncate font-mono text-xs text-gray-500">{it.mint}</div>
              </div>
              <div className="text-xs text-gray-400">dev: {pctf(it.devPctAtAdd, 3)} → <b className={devDrop ? "text-red-400" : ""}>{pctf(it.lastDevPct, 3)}</b></div>
              {devDrop && <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-black text-white">⚡ DEV SOLD</span>}
              {scoreDelta !== 0 && <span className={`text-xs font-bold ${scoreDelta > 0 ? "text-pump" : "text-red-400"}`}>{scoreDelta > 0 ? "▲" : "▼"}{Math.abs(scoreDelta)}</span>}
              <span className="text-xs text-gray-500">{status[it.mint] || (it.lastCheckedAt ? ago(it.lastCheckedAt) : "")}</span>
              <button className="text-xs text-gray-500 hover:text-red-400" onClick={() => remove(it.mint)}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default function Page() { return <Gate need="Hunter"><Watch /></Gate>; }
