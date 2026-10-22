// Small fetch helper with timeout + short in-memory TTL cache (per server process).
type Entry = { at: number; value: SourceResult<unknown> };
const cache = new Map<string, Entry>();

export type SourceResult<T> = { ok: true; data: T; ms: number } | { ok: false; error: string; ms: number };

export async function fetchJson<T = any>(
  url: string,
  opts: { ttlMs?: number; timeoutMs?: number; init?: RequestInit; cacheKey?: string } = {}
): Promise<SourceResult<T>> {
  const { ttlMs = 45_000, timeoutMs = 9_000, init, cacheKey } = opts;
  const key = cacheKey ?? `${init?.method ?? "GET"} ${url} ${typeof init?.body === "string" ? init.body : ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as SourceResult<T>;
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let value: SourceResult<T>;
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "PokeSnap/0.1", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      value = { ok: false, error: `HTTP ${res.status}`, ms: Date.now() - started };
    } else {
      value = { ok: true, data: (await res.json()) as T, ms: Date.now() - started };
    }
  } catch (e: any) {
    value = { ok: false, error: e?.name === "AbortError" ? "timeout" : String(e?.message ?? e), ms: Date.now() - started };
  } finally {
    clearTimeout(t);
  }
  // cache failures briefly too, to avoid hammering a dead source
  cache.set(key, { at: Date.now() - (value.ok ? 0 : ttlMs - 10_000), value });
  if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
  return value;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}
