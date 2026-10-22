"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
const SUGGEST = ["top movers", "safest graduated", "riskiest movers", "score BXoHJddsWJLHtAopeiSbKUSELsu8hSFMs8baGMDkpump", "search pokemon"];

export default function Ask() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Pika-pika! ⚡ Ask me about any pump.fun coin. Try “score <mint>”, “top movers” or “safest graduated”." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const send = async (text = input) => {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(1) }) });
      const j = await r.json();
      setMode(j.mode);
      setMsgs([...next, { role: "assistant", content: j.reply }]);
    } catch (e: any) {
      setMsgs([...next, { role: "assistant", content: `⚠️ ${e?.message ?? e}` }]);
    } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center gap-3">
        <img src="/mascot-calm.jpg" className="h-12 w-12 rounded-full object-cover ring-2 ring-pump" alt="" />
        <h1 className="text-3xl font-black">Ask <span className="text-pump">PokeSnap</span></h1>
        {mode && <span className="ml-auto rounded bg-coal-800 px-2 py-1 text-xs text-gray-400">{mode === "llm" ? "LLM + tools" : "rule mode"}</span>}
      </div>
      <div className="card h-[60vh] space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "ml-auto bg-pump text-coal-950" : "bg-coal-800"}`}>{m.content}</div>
        ))}
        {busy && <div className="text-sm text-pump">⚡ sniffing…</div>}
        <div ref={end} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">{SUGGEST.map((s) => <button key={s} className="rounded-lg border border-coal-600 px-2 py-1 text-xs text-gray-400 hover:border-pump" onClick={() => send(s)}>{s.length > 30 ? s.slice(0, 30) + "…" : s}</button>)}</div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="score <mint> / top movers / safest graduated" />
        <button className="btn-neon" disabled={busy}>Send</button>
      </form>
    </div>
  );
}
