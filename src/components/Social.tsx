"use client";
import { useState } from "react";

export const X_URL = process.env.NEXT_PUBLIC_X_URL || "";
export const CA = process.env.NEXT_PUBLIC_CA || "";

export function XLink({ className = "" }: { className?: string }) {
  if (!X_URL) return null;
  return (
    <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="PokeSnap on X" data-testid="x-link"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-coal-700 text-gray-200 transition hover:border-pump hover:text-pump ${className}`}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    </a>
  );
}

export function CAPill({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  if (!CA) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CA);
    } catch {
      const t = document.createElement("textarea");
      t.value = CA; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <>
      <button onClick={copy} data-testid="ca-pill" title="Copy contract address"
        className={`inline-flex h-9 max-w-full items-center gap-2 whitespace-nowrap rounded-lg border border-pump/40 bg-pump/10 px-3 font-mono text-xs text-pump transition hover:bg-pump/20 ${className}`}>
        <span className="font-sans font-bold">CA:</span>
        <span className="hidden truncate sm:inline">{CA}</span>
        <span className="sm:hidden">{CA.length > 10 ? `${CA.slice(0, 4)}…${CA.slice(-4)}` : CA}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
      </button>
      {copied && (
        <div role="status" data-testid="toast" className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-pump px-4 py-2 text-sm font-bold text-coal-950 shadow-lg">Copied</div>
      )}
    </>
  );
}
