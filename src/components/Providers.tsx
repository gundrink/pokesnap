"use client";
import { createAppKit, useAppKitAccount } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana } from "@reown/appkit/networks";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { tierFor, UNLOCK_ALL, POKESNAP_MINT, type TierName } from "@/lib/tiers";
import { MotionConfig } from "framer-motion";

export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

let appKitReady = false;
if (typeof window !== "undefined" && REOWN_PROJECT_ID && !appKitReady) {
  appKitReady = true;
  createAppKit({
    adapters: [new SolanaAdapter()],
    networks: [solana],
    defaultNetwork: solana,
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: "PokeSnap",
      description: "Electric critter that scores pump.fun tokens and zaps the bad ones.",
      url: window.location.origin,
      icons: [`${window.location.origin}/mascot-calm.webp`],
    },
    themeMode: "dark",
    themeVariables: { "--w3m-accent": "#4ADE80", "--w3m-border-radius-master": "3px" },
    features: { analytics: false, email: false, socials: false },
  });
}
export const appKitEnabled = () => appKitReady;

type TierCtx = { balance: number; tier: TierName; loading: boolean; unlockAll: boolean; mintConfigured: boolean; address?: string; error?: string };
const Ctx = createContext<TierCtx>({ balance: 0, tier: "Free", loading: false, unlockAll: UNLOCK_ALL, mintConfigured: !!POKESNAP_MINT });
export const useTier = () => useContext(Ctx);

function useSolAddress(): string | undefined {
  // Hooks are safe only once createAppKit ran; guard keeps the app working without a project id.
  if (!REOWN_PROJECT_ID) return undefined;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { address, isConnected } = useAppKitAccount({ namespace: "solana" });
  return isConnected ? address : undefined;
}

function TierProvider({ children }: { children: ReactNode }) {
  const address = useSolAddress();
  const [state, setState] = useState<TierCtx>({ balance: 0, tier: "Free", loading: false, unlockAll: UNLOCK_ALL, mintConfigured: !!POKESNAP_MINT });
  useEffect(() => {
    if (!address || !POKESNAP_MINT) {
      setState((s) => ({ ...s, address, balance: 0, tier: "Free", loading: false }));
      return;
    }
    let dead = false;
    setState((s) => ({ ...s, address, loading: true }));
    fetch(`/api/balance?owner=${address}`)
      .then((r) => r.json())
      .then((j) => !dead && setState((s) => ({ ...s, loading: false, balance: j.balance ?? 0, tier: tierFor(j.balance ?? 0), error: j.error })))
      .catch((e) => !dead && setState((s) => ({ ...s, loading: false, error: String(e) })));
    return () => {
      dead = true;
    };
  }, [address]);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TierProvider>{children}</TierProvider>
    </MotionConfig>
  );
}
