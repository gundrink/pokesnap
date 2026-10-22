export const usd = (n?: number | null) =>
  n == null ? "—" : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;
export const pctf = (n?: number | null, d = 1) => (n == null ? "—" : `${n.toFixed(d)}%`);
export const shortAddr = (a?: string) => (!a ? "—" : `${a.slice(0, 4)}…${a.slice(-4)}`);
export const ago = (ms: number) => {
  const s = (Date.now() - ms) / 1000;
  return s < 60 ? `${s | 0}s ago` : s < 3600 ? `${(s / 60) | 0}m ago` : s < 86400 ? `${(s / 3600) | 0}h ago` : `${(s / 86400) | 0}d ago`;
};
export const ipfs = (u?: string) => (!u ? undefined : u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u.startsWith("http") ? u : `https://ipfs.io/ipfs/${u}`);
export const scoreColor = (s: number) => (s >= 80 ? "#4ADE80" : s >= 50 ? "#FACC15" : s >= 25 ? "#FB923C" : "#EF4444");
