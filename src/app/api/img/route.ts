import { NextRequest } from "next/server";
import { isSolanaMint, PUMP } from "@/lib/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Image proxy: token logos come from dozens of hosts (ipfs gateways, pinata, filebase, axiom cdn,
// j7tracker...), many send CORP/CORS headers that browsers block. We fetch server-side,
// verify it's really an image, and serve it same-origin with long cache headers.
const GATEWAYS = ["https://ipfs.io/ipfs/", "https://cf-ipfs.com/ipfs/", "https://gateway.pinata.cloud/ipfs/", "https://dweb.link/ipfs/"];
const MAX = 6 * 1024 * 1024;
const mem = new Map<string, { at: number; type: string; buf: ArrayBuffer }>();

const privateHost = (h: string) => /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1|\[?f[cd])/i.test(h) || h.endsWith(".local") || h.endsWith(".internal");

function cidOf(u: string): string | undefined {
  if (u.startsWith("ipfs://")) return u.slice(7).replace(/^ipfs\//, "");
  const m = u.match(/\/ipfs\/([^?#]+)/);
  if (m) return m[1];
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{50,})$/.test(u)) return u;
}

function candidates(u: string): string[] {
  const cid = cidOf(u);
  const out: string[] = [];
  if (/^https?:\/\//.test(u)) out.push(u.replace(/^http:/, "https:"));
  if (cid) GATEWAYS.forEach((g) => out.push(g + cid));
  return [...new Set(out)];
}

async function get(url: string, ms = 7000): Promise<Response | undefined> {
  try {
    const h = new URL(url).hostname;
    if (privateHost(h)) return;
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), redirect: "follow", headers: { "user-agent": "Mozilla/5.0 PokeSnap", accept: "image/*,application/json;q=0.9,*/*;q=0.5" } });
    return r.ok ? r : undefined;
  } catch {}
}

async function tryImage(u: string, depth = 0): Promise<{ type: string; buf: ArrayBuffer } | undefined> {
  for (const c of candidates(u)) {
    const r = await get(c);
    if (!r) continue;
    const type = (r.headers.get("content-type") || "").split(";")[0].trim();
    const len = Number(r.headers.get("content-length") || 0);
    if (len > MAX) continue;
    if (type.startsWith("image/") || type === "application/octet-stream" || type === "binary/octet-stream") {
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX || buf.byteLength < 50) continue;
      const sniff = sniffType(new Uint8Array(buf));
      if (!type.startsWith("image/") && !sniff) continue;
      if (type === "image/svg+xml" || sniff === "image/svg+xml") return { type: "image/svg+xml", buf }; // served with CSP sandbox below
      return { type: sniff || type, buf };
    }
    // metadata JSON -> image
    if (depth < 1 && (type.includes("json") || type.startsWith("text/"))) {
      try {
        const j = JSON.parse(await r.text());
        const img = j?.image || j?.image_uri || j?.properties?.files?.[0]?.uri;
        if (typeof img === "string") { const x = await tryImage(img, depth + 1); if (x) return x; }
      } catch {}
    }
  }
}

function sniffType(b: Uint8Array): string | undefined {
  if (b[0] === 0x89 && b[1] === 0x50) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57) return "image/webp";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "image/avif";
  const head = new TextDecoder().decode(b.slice(0, 200)).trimStart();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
}

async function chainForMint(mint: string): Promise<string[]> {
  const out: string[] = [];
  const j = async (u: string) => { const r = await get(u, 6000); try { return r ? await r.json() : undefined; } catch {} };
  const [pump, dex, rug] = await Promise.all([
    j(`${PUMP}/coins-v2/${mint}`),
    j(`https://api.dexscreener.com/latest/dex/tokens/${mint}`),
    j(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`),
  ]);
  if (pump?.image_uri) out.push(pump.image_uri);
  if (pump?.metadata_uri) out.push(pump.metadata_uri);
  const di = dex?.pairs?.find((p: any) => p?.baseToken?.address === mint && p?.info?.imageUrl)?.info?.imageUrl;
  if (di) out.push(di);
  if (rug?.fileMeta?.image) out.push(rug.fileMeta.image);
  if (rug?.tokenMeta?.uri) out.push(rug.tokenMeta.uri);
  return out;
}

function avatar(seed: string, label: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const txt = (label || "?").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,42%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},60%,22%)"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="url(#g)"/><text x="64" y="78" font-family="system-ui,sans-serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle">${txt.replace(/[<&>]/g, "")}</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=600", "x-pokesnap-img": "avatar" } });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const url = sp.get("url")?.trim() || "";
  const mint = sp.get("mint")?.trim() || "";
  const label = sp.get("label") || "";
  const key = `${mint}|${url}`;
  const hit = mem.get(key);
  const send = (x: { type: string; buf: ArrayBuffer }, src: string) =>
    new Response(x.buf, {
      headers: {
        "content-type": x.type,
        "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "x-content-type-options": "nosniff",
        "x-pokesnap-img": src,
      },
    });
  if (hit && Date.now() - hit.at < 6 * 3.6e6) return send(hit, "cache");

  const list: string[] = [];
  if (url) list.push(url);
  const validMint = isSolanaMint(mint);
  for (const u of list) { const x = await tryImage(u); if (x) { remember(key, x); return send(x, "url"); } }
  if (validMint) {
    for (const u of await chainForMint(mint)) {
      if (u === url) continue;
      const x = await tryImage(u);
      if (x) { remember(key, x); return send(x, "chain"); }
    }
  }
  return avatar(mint || url, label);
}

function remember(key: string, x: { type: string; buf: ArrayBuffer }) {
  mem.set(key, { at: Date.now(), ...x });
  if (mem.size > 500) mem.delete(mem.keys().next().value as string);
}
