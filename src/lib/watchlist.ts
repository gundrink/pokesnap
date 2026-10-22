"use client";
export type WatchItem = { mint: string; name: string; symbol: string; addedAt: number; devPctAtAdd?: number; lastDevPct?: number; lastScore?: number; lastCheckedAt?: number };
const KEY = "pokesnap.watchlist.v1";
export const loadWatch = (): WatchItem[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};
export const saveWatch = (l: WatchItem[]) => localStorage.setItem(KEY, JSON.stringify(l));
export const addWatch = (i: WatchItem) => {
  const l = loadWatch().filter((x) => x.mint !== i.mint);
  saveWatch([i, ...l]);
};
