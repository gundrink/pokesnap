"use client";
import { useEffect } from "react";
import Reaction from "@/components/Reaction";
import Factors from "@/components/Factors";
import { useScore } from "@/lib/useScore";
import { POKESNAP_MINT } from "@/lib/tiers";

export default function Self() {
  const { data, error, loading, run } = useScore();
  useEffect(() => { if (POKESNAP_MINT) run(POKESNAP_MINT); }, [run]);
  return (
    <div>
      <h1 className="text-3xl font-black">Self <span className="text-pump">Score</span></h1>
      <p className="mb-4 text-gray-400">PokeSnap scores its own token in public, with the same engine. No exceptions.</p>
      {!POKESNAP_MINT && <div className="card p-6 text-gray-400">$PokeSnap hasn't launched yet — set <code>NEXT_PUBLIC_POKESNAP_MINT</code> after launch and this page scores it live.</div>}
      {loading && <div className="text-pump">⚡ Scoring ourselves…</div>}
      {error && <div className="text-red-400">⚠️ {error}</div>}
      {data && <div className="grid gap-6 lg:grid-cols-2"><Reaction r={data} /><Factors r={data} /></div>}
    </div>
  );
}
