"use client";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tierFor, UNLOCK_ALL, POKESNAP_MINT, type TierName } from "@/lib/tiers";
import "@solana/wallet-adapter-react-ui/styles.css";

type TierCtx = { balance: number; tier: TierName; loading: boolean; unlockAll: boolean; mintConfigured: boolean; error?: string };
const Ctx = createContext<TierCtx>({ balance: 0, tier: "Free", loading: false, unlockAll: UNLOCK_ALL, mintConfigured: !!POKESNAP_MINT });
export const useTier = () => useContext(Ctx);

function TierProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const [state, setState] = useState<TierCtx>({ balance: 0, tier: "Free", loading: false, unlockAll: UNLOCK_ALL, mintConfigured: !!POKESNAP_MINT });
  useEffect(() => {
    if (!publicKey || !POKESNAP_MINT) {
      setState((s) => ({ ...s, balance: 0, tier: "Free", loading: false }));
      return;
    }
    let dead = false;
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/balance?owner=${publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((j) => !dead && setState((s) => ({ ...s, loading: false, balance: j.balance ?? 0, tier: tierFor(j.balance ?? 0), error: j.error })))
      .catch((e) => !dead && setState((s) => ({ ...s, loading: false, error: String(e) })));
    return () => {
      dead = true;
    };
  }, [publicKey]);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TierProvider>{children}</TierProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
