"use client";
import type { ReactNode } from "react";
import { useTier } from "./Providers";
import { tierRank, TIERS, type TierName } from "@/lib/tiers";

export default function Gate({ need, children }: { need: TierName; children: ReactNode }) {
  const { tier, unlockAll, balance, mintConfigured } = useTier();
  if (unlockAll || tierRank(tier) >= tierRank(need)) return <>{children}</>;
  const min = TIERS.find((t) => t.name === need)!.min;
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <img src="/mascot-attack.jpg" className="mx-auto mb-4 h-40 w-40 rounded-2xl object-cover opacity-80" alt="" />
      <h2 className="text-2xl font-black">🔒 {need} tier required</h2>
      <p className="mt-2 text-gray-400">
        Hold at least <b className="text-volt">{min.toLocaleString()} $PokeSnap</b> to unlock. You hold {balance.toLocaleString()}.
      </p>
      {!mintConfigured && <p className="mt-2 text-xs text-gray-500">Token mint not configured yet (NEXT_PUBLIC_POKESNAP_MINT).</p>}
    </div>
  );
}
