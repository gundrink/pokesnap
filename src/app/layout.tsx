import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "PokeSnap ⚡ — sniff out pump.fun rugs",
  description: "AI-ish electric critter that scores pump.fun tokens 0-100 and zaps the bad ones. Purely visual. Not financial advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {/* overflow-clip: flying shards/halves are transformed outside their cards; clip them to the real content box so they never stretch the document height */}
          <div className="overflow-clip">
          <Nav />
          <main className="page-enter mx-auto max-w-7xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-gray-600">
            PokeSnap is a fan-made risk viewer. Scores are heuristics from public data (pump.fun, DexScreener, RugCheck, Solana RPC) — not financial advice. Zaps are visual only.
          </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
