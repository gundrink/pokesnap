"use client";
import { motion } from "framer-motion";
import type { ScoreResult } from "@/lib/score";

const COL = { good: "#4ADE80", warn: "#FACC15", bad: "#EF4444", unknown: "#6b7280" } as const;

export default function Factors({ r }: { r: ScoreResult }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-lg font-black">Factor breakdown <span className="text-sm font-normal text-gray-500">(higher = safer)</span></h3>
      <div className="space-y-3">
        {r.factors.map((f, i) => (
          <motion.div key={f.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.035 }}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{f.label}</span>
              <span className="font-mono" style={{ color: COL[f.status] }}>{f.points}/{f.weight} {f.status === "unknown" && "(no data)"}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-coal-700">
              <motion.div className="h-full rounded-full" style={{ background: COL[f.status] }} initial={{ width: 0 }} animate={{ width: `${(f.points / f.weight) * 100}%` }} transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 + i * 0.035 }} />
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
              {f.evidence.map((e, j) => <li key={j}>• {e}</li>)}
            </ul>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-coal-700 pt-3 text-xs">
        {r.sources.map((s) => (
          <span key={s.name} className={`rounded-md px-2 py-1 ${s.ok ? "bg-pump/10 text-pump" : "bg-red-500/10 text-red-400"}`} title={s.error}>
            {s.ok ? "●" : "✕"} {s.name} {s.ok ? `${s.ms}ms` : `failed: ${s.error}`}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
        <a className="hover:text-pump" href={r.links.pump} target="_blank">pump.fun ↗</a>
        {r.links.dex && <a className="hover:text-pump" href={r.links.dex} target="_blank">DexScreener ↗</a>}
        <a className="hover:text-pump" href={r.links.rugcheck} target="_blank">RugCheck ↗</a>
        {r.links.twitter && <a className="hover:text-pump" href={r.links.twitter} target="_blank">X ↗</a>}
        {r.links.website && <a className="hover:text-pump" href={r.links.website} target="_blank">Web ↗</a>}
        <span className="ml-auto">scored {new Date(r.scoredAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
