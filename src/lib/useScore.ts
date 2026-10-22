"use client";
import { useCallback, useRef, useState } from "react";
import type { ScoreResult } from "./score";

// Fast score first (<5s), then the deep check (launch forensics + wallet-funding trace) refreshes the result.
export function useScore() {
  const [data, setData] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const seq = useRef(0);
  const run = useCallback(async (mint: string, fresh = false) => {
    const id = ++seq.current;
    const m = encodeURIComponent(mint.trim());
    setLoading(true);
    setDeepLoading(false);
    setError(null);
    try {
      const r = await fetch(`/api/score?mint=${m}${fresh ? "&fresh=1" : ""}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      if (id !== seq.current) return null;
      setData(j);
      setLoading(false);
      if (j.deepPending) {
        setDeepLoading(true);
        fetch(`/api/score?mint=${m}&deep=1`)
          .then((x) => (x.ok ? x.json() : null))
          .then((d) => { if (d && id === seq.current) setData(d); })
          .catch(() => {})
          .finally(() => { if (id === seq.current) setDeepLoading(false); });
      }
      return j as ScoreResult;
    } catch (e: any) {
      if (id === seq.current) { setError(String(e?.message ?? e)); setData(null); }
      return null;
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);
  return { data, error, loading, deepLoading, run };
}
