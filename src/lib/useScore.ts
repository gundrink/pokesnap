"use client";
import { useCallback, useState } from "react";
import type { ScoreResult } from "./score";

export function useScore() {
  const [data, setData] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const run = useCallback(async (mint: string, fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/score?mint=${encodeURIComponent(mint.trim())}${fresh ? "&fresh=1" : ""}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setData(j);
      return j as ScoreResult;
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return { data, error, loading, run };
}
