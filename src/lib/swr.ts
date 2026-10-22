// Tiny stale-while-revalidate cache for expensive route payloads (per server process).
const store = new Map<string, { at: number; v: unknown; p?: Promise<unknown> }>();

export async function swr<T>(key: string, freshMs: number, maxStaleMs: number, compute: () => Promise<T>): Promise<{ v: T; stale: boolean }> {
  const e = store.get(key);
  const age = e ? Date.now() - e.at : Infinity;
  const refresh = () => {
    const cur = store.get(key);
    if (cur?.p) return cur.p as Promise<T>;
    const p = compute()
      .then((v) => { store.set(key, { at: (v as any)?.partial ? Date.now() - freshMs + 10_000 : Date.now(), v }); return v; })
      .catch((err) => { const c = store.get(key); if (c) c.p = undefined; else store.delete(key); throw err; });
    if (cur) cur.p = p; else store.set(key, { at: 0, v: undefined, p });
    return p;
  };
  if (e && e.at && age < freshMs) return { v: e.v as T, stale: false };
  if (e && e.at && age < maxStaleMs) { refresh().catch(() => {}); return { v: e.v as T, stale: true }; }
  return { v: await refresh(), stale: false };
}
