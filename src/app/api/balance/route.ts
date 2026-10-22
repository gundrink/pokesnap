import { NextResponse } from "next/server";
import { isSolanaMint, rpc } from "@/lib/sources";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner") ?? "";
  const mint = process.env.NEXT_PUBLIC_POKESNAP_MINT ?? "";
  if (!isSolanaMint(owner)) return NextResponse.json({ error: "bad owner" }, { status: 400 });
  if (!mint) return NextResponse.json({ configured: false, balance: 0 });
  const r = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }[] }>(
    "getTokenAccountsByOwner",
    [owner, { mint }, { encoding: "jsonParsed" }],
    15_000
  );
  if (!r.ok) return NextResponse.json({ configured: true, error: r.error, balance: 0 }, { status: 502 });
  const balance = r.data.value.reduce((a, v) => a + (v.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
  return NextResponse.json({ configured: true, balance });
}
