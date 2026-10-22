"use client";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { REOWN_PROJECT_ID } from "./Providers";

const cls = "h-10 rounded-xl bg-pump px-4 whitespace-nowrap text-sm font-extrabold text-coal-950 transition hover:brightness-110 active:scale-[0.98]";

function Inner() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount({ namespace: "solana" });
  return (
    <button data-testid="connect-wallet" className={cls} onClick={() => open(isConnected ? { view: "Account" } : { view: "Connect", namespace: "solana" })}>
      {isConnected && address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "Select Wallet"}
    </button>
  );
}

export default function ConnectButton() {
  if (!REOWN_PROJECT_ID)
    return <button className={`${cls} opacity-50`} disabled title="Set NEXT_PUBLIC_REOWN_PROJECT_ID">Select Wallet</button>;
  return <Inner />;
}
