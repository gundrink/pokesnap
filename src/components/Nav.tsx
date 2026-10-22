"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useTier } from "./Providers";
import { POKESNAP_MINT } from "@/lib/tiers";

const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton), { ssr: false });

const LINKS = [
  ["/", "Snap Scanner"],
  ["/arena", "Live Arena"],
  ["/meta", "Meta Radar"],
  ["/shame", "Hall of Shame"],
  ["/ask", "Ask PokeSnap"],
  ["/watch", "Dev Watch"],
  ["/self", "Self Score"],
  ["/burn", "Burn Tracker"],
] as const;

export default function Nav() {
  const path = usePathname();
  const { tier, balance, unlockAll, loading } = useTier();
  const links = LINKS.filter(([h]) => POKESNAP_MINT || (h !== "/burn" && h !== "/self"));
  return (
    <header className="sticky top-0 z-40 border-b border-coal-700 bg-coal-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/mascot-calm.webp" alt="PokeSnap" className="h-9 w-9 object-contain drop-shadow" />
          <span className="text-xl font-black tracking-tight">
            Poke<span className="text-pump">Snap</span>
            <span className="text-volt">⚡</span>
          </span>
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm lg:order-2 lg:w-auto lg:flex-1">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold ${path === href ? "bg-pump text-coal-950" : "text-gray-300 hover:text-pump"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="order-2 ml-auto flex items-center gap-2 lg:order-3">
          <span className="rounded-lg border border-volt/40 px-2 py-1 text-xs font-bold text-volt" title={`${balance.toLocaleString()} $PokeSnap`}>
            {loading ? "…" : tier}
            {unlockAll && " · unlocked"}
          </span>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
