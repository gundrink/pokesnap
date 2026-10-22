"use client";
import { useState } from "react";

export const logoSrc = (mint?: string, image?: string, label?: string) => {
  const p = new URLSearchParams();
  if (mint) p.set("mint", mint);
  if (image) p.set("url", image);
  if (label) p.set("label", label);
  return `/api/img?${p.toString()}`;
};

export function TokenLogo({ mint, image, label, className = "h-12 w-12 rounded-xl" }: { mint?: string; image?: string; label?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || (!mint && !image)) {
    return <div className={`${className} grid place-items-center bg-coal-700 text-xs font-bold text-white/70`}>{(label || "?").slice(0, 2).toUpperCase()}</div>;
  }
  return <img src={logoSrc(mint, image, label)} alt={label || ""} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`${className} object-cover`} />;
}
