"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProspectItem {
  id: string; name: string; city?: string | null; phone?: string | null;
  category?: string | null; score?: string | null; website?: string | null;
  google_rating?: number | null; reviews_count?: number | null;
  autoScoreLabel?: string | null; description?: string | null;
  status: string; sourceUrl?: string | null;
}
interface ChatMsg { role: "max" | "user"; text: string; ts: number }
interface CallLog {
  id: string; type: "sim" | "real"; prospectName: string; prospectCity?: string | null;
  startedAt: string; endedAt?: string; durationSec?: number;
  outcome?: string | null; messages: ChatMsg[]; vapiCallId?: string;
}
interface VapiConfig {
  vapiApiKey: string | null; vapiPhoneNumberId: string | null;
  vapiAssistantId: string | null; elevenLabsVoiceId: string | null;
  hasVapi: boolean;
}

type Section = "sim" | "auto" | "history" | "config";

const SCORE_ORDER = ["🔥", "😊", "🤔", "❄️"];
const OUTCOMES = [
  { id: "interested", label: "Intéressé !", emoji: "🟢", cls: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  { id: "callback",   label: "Rappeler",    emoji: "📅", cls: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
  { id: "voicemail",  label: "Messagerie",  emoji: "📵", cls: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  { id: "refused",    label: "Refusé",      emoji: "🔴", cls: "bg-red-500/20 border-red-500/40 text-red-300" },
];

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NovaAgentTab() {
  const [section, setSection] = useState<Section>("sim");
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [loadingP, setLoadingP] = useState(true);

  // ── Config ──
  const [cfg, setCfg] = useState<VapiConfig>({ vapiApiKey: null, vapiPhoneNumberId: null, vapiAssistantId: null, elevenLabsVoiceId: null, hasVapi: false });
  const [cfgEdit, setCfgEdit] = useState({ vapiApiKey: "", vapiPhoneNumberId: "", elevenLabsVoiceId: "" });
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgSaved, setCfgSaved] = useState(false);

  // ── Simulation ──
  const [simProspect, setSimProspect] = useState<ProspectItem | null>(null);
  const [simState, setSimState] = useState<"idle" | "ringing" | "active" | "ended">("idle");
  const [simMessages, setSimMessages] = useState<ChatMsg[]>([]);
  const [simInput, setSimInput] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simOutcome, setSimOutcome] = useState<string | null>(null);
  const [simStartTime, setSimStartTime] = useState(0);
  const [simTimer, setSimTimer] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [prospectSearch, setProspectSearch] = useState("");
  const timerRef = useRef<any>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

  // ── Auto call queue ──
  const [autoSelected, setAutoSelected] = useState<Set<string>>(new Set());
  const [autoQueue, setAutoQueue] = useState<{ prospect: ProspectItem; status: "pending" | "calling" | "done" | "error"; callId?: string; error?: string }[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoCurrentIdx, setAutoCurrentIdx] = useState(-1);
  const autoAbortRef = useRef(false);

  // ── History ──
  const [history, setHistory] = useState<CallLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // ── Load ──
  useEffect(() => { loadProspects(); loadConfig(); loadHistory(); }, []);

  useEffect(() => {
    if (simState === "active") {
      timerRef.current = setInterval(() => setSimTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (simState === "idle") setSimTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [simState]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [simMessages]);

  async function loadProspects() {
    setLoadingP(true);
    try {
      const res = await fetch("/api/prospection/map");
      const json = await res.json();
      setProspects(json.prospects ?? []);
    } catch {}
    setLoadingP(false);
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/nova-agent/config");
      const json = await res.json();
      setCfg(json);
      setCfgEdit({
        vapiApiKey: json.vapiApiKey ?? "",
        vapiPhoneNumberId: json.vapiPhoneNumberId ?? "",
        elevenLabsVoiceId: json.elevenLabsVoiceId ?? "",
      });
    } catch {}
  }

  function loadHistory() {
    try {
      const stored = localStorage.getItem("nova-calls");
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }

  function saveHistory(logs: CallLog[]) {
    const trimmed = logs.slice(0, 100);
    setHistory(trimmed);
    localStorage.setItem("nova-calls", JSON.stringify(trimmed));
  }

  async function saveConfig() {
    setCfgSaving(true);
    try {
      await fetch("/api/nova-agent/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfgEdit),
      });
      await loadConfig();
      setCfgSaved(true);
      setTimeout(() => setCfgSaved(false), 2000);
    } catch {}
    setCfgSaving(false);
  }

  // ── Simulation ──────────────────────────────────────────────────────────────

  function speak(text: string) {
    if (!voiceOn || typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 1.05;
    u.pitch = 0.88;
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const fr = voices.find(v => v.lang.startsWith("fr-FR") && v.name.toLowerCase().includes("male"))
      ?? voices.find(v => v.lang.startsWith("fr"))
      ?? null;
    if (fr) u.voice = fr;
    window.speechSynthesis?.speak(u);
  }

  async function startSim() {
    if (!simProspect) return;
    setSimState("ringing");
    setSimMessages([]);
    setSimOutcome(null);
    setSimTimer(0);
    setTimeout(async () => {
      setSimState("active");
      setSimStartTime(Date.now());
      await sendToMax([], true);
    }, 2200);
  }

  async function sendToMax(history: ChatMsg[], isFirst = false) {
    setSimLoading(true);
    try {
      const res = await fetch("/api/nova-agent/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect: simProspect,
          messages: history.map(m => ({
            role: m.role === "max" ? "assistant" : "user",
            content: m.text,
          })),
          isFirst,
        }),
      });
      const { reply } = await res.json();
      const msg: ChatMsg = { role: "max", text: reply, ts: Date.now() };
      setSimMessages(prev => [...prev, msg]);
      speak(reply);
    } catch {
      const err: ChatMsg = { role: "max", text: "… (erreur de connexion)", ts: Date.now() };
      setSimMessages(prev => [...prev, err]);
    }
    setSimLoading(false);
  }

  async function handleSend() {
    if (!simInput.trim() || simLoading || simState !== "active") return;
    const text = simInput.trim();
    setSimInput("");
    const userMsg: ChatMsg = { role: "user", text, ts: Date.now() };
    const newHistory = [...simMessages, userMsg];
    setSimMessages(newHistory);
    await sendToMax(newHistory, false);
  }

  function toggleMic() {
    if (micOn) {
      recogRef.current?.stop();
      setMicOn(false);
      return;
    }
    const SR = typeof window !== "undefined"
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SR) { alert("Votre navigateur ne supporte pas la reconnaissance vocale (Chrome recommandé)."); return; }
    const r = new SR();
    r.lang = "fr-FR";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript ?? "";
      setSimInput(t);
      setMicOn(false);
    };
    r.onend = () => setMicOn(false);
    r.onerror = () => setMicOn(false);
    recogRef.current = r;
    r.start();
    setMicOn(true);
  }

  function endSim(outcome?: string) {
    window.speechSynthesis?.cancel();
    recogRef.current?.stop();
    setMicOn(false);
    setSimState("ended");
    const log: CallLog = {
      id: Date.now().toString(),
      type: "sim",
      prospectName: simProspect!.name,
      prospectCity: simProspect!.city,
      startedAt: new Date(simStartTime).toISOString(),
      endedAt: new Date().toISOString(),
      durationSec: simTimer,
      outcome: outcome ?? simOutcome ?? null,
      messages: simMessages,
    };
    saveHistory([log, ...history]);
    if (outcome) setSimOutcome(outcome);
  }

  function resetSim() {
    window.speechSynthesis?.cancel();
    setSimState("idle");
    setSimMessages([]);
    setSimInput("");
    setSimOutcome(null);
    setSimTimer(0);
  }

  const simProspects = prospects
    .filter(p => !prospectSearch || p.name.toLowerCase().includes(prospectSearch.toLowerCase()) || p.city?.toLowerCase().includes(prospectSearch.toLowerCase()))
    .sort((a, b) => {
      const sa = SCORE_ORDER.indexOf(a.score ?? "");
      const sb = SCORE_ORDER.indexOf(b.score ?? "");
      return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
    });

  // ── Auto calls ──────────────────────────────────────────────────────────────

  const autoProspects = prospects
    .filter(p => p.phone && p.status !== "IGNORED" && p.status !== "ACTIVATED")
    .sort((a, b) => {
      const sa = SCORE_ORDER.indexOf(a.score ?? "");
      const sb = SCORE_ORDER.indexOf(b.score ?? "");
      return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
    });

  function toggleAutoSelect(id: string) {
    setAutoSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAllAuto() {
    if (autoSelected.size === autoProspects.length) {
      setAutoSelected(new Set());
    } else {
      setAutoSelected(new Set(autoProspects.map(p => p.id)));
    }
  }

  async function launchAutoCalls() {
    if (!cfg.hasVapi) return;
    const toCall = autoProspects.filter(p => autoSelected.has(p.id));
    if (toCall.length === 0) return;
    setAutoRunning(true);
    autoAbortRef.current = false;
    const queue = toCall.map(p => ({ prospect: p, status: "pending" as const }));
    setAutoQueue(queue);
    setAutoCurrentIdx(0);

    for (let i = 0; i < queue.length; i++) {
      if (autoAbortRef.current) break;
      setAutoCurrentIdx(i);
      setAutoQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: "calling" } : item));

      try {
        const res = await fetch("/api/nova-agent/call", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospect: queue[i].prospect }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? json.error ?? "Erreur");

        setAutoQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "done", callId: json.callId } : item
        ));

        // Save to history
        const log: CallLog = {
          id: json.callId ?? Date.now().toString(),
          type: "real",
          prospectName: queue[i].prospect.name,
          prospectCity: queue[i].prospect.city,
          startedAt: new Date().toISOString(),
          vapiCallId: json.callId,
          messages: [],
        };
        saveHistory([log, ...history]);

        // Wait 3s between calls (courtesy delay)
        if (i < queue.length - 1) await new Promise(r => setTimeout(r, 3000));
      } catch (e: any) {
        setAutoQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "error", error: e.message } : item
        ));
      }
    }

    setAutoRunning(false);
    setAutoCurrentIdx(-1);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const SECTIONS: { id: Section; label: string; emoji: string }[] = [
    { id: "sim", label: "Simulation", emoji: "🧪" },
    { id: "auto", label: "Appels Auto", emoji: "📡" },
    { id: "history", label: "Historique", emoji: "📊" },
    { id: "config", label: "Config", emoji: "⚙️" },
  ];

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-52 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col py-4">
        {/* Logo */}
        <div className="px-4 mb-6">
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-center">
            <p className="text-2xl mb-0.5">🤖</p>
            <p className="text-white font-black text-sm">NovaAgent<span className="text-violet-400">Com</span></p>
            <p className="text-violet-400/70 text-[10px]">by Nova Tech · MAX IA</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-2 flex-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${
                section === s.id
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}>
              <span className="text-base">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Status badge */}
        <div className="px-4 mt-4">
          <div className={`rounded-lg border p-2 text-center ${cfg.hasVapi ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-700 bg-slate-900"}`}>
            <p className={`text-[10px] font-bold ${cfg.hasVapi ? "text-emerald-400" : "text-slate-500"}`}>
              {cfg.hasVapi ? "✅ Vapi configuré" : "⚠️ Vapi non configuré"}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {cfg.hasVapi ? "Appels réels activés" : "Simulation uniquement"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">

        {/* ── SIMULATION ───────────────────────────────────────── */}
        {section === "sim" && (
          <div className="flex h-full overflow-hidden">

            {/* Prospect picker */}
            <div className="w-64 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
              <div className="px-3 py-3 border-b border-slate-800 space-y-2 flex-shrink-0">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wide">Choisir un prospect</p>
                <input
                  value={prospectSearch} onChange={e => setProspectSearch(e.target.value)}
                  placeholder="🔍 Rechercher…"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingP ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                  </div>
                ) : simProspects.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8 px-3">Aucun prospect sauvegardé</p>
                ) : simProspects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSimProspect(p); resetSim(); }}
                    disabled={simState === "active" || simState === "ringing"}
                    className={`w-full text-left flex items-start gap-2 px-3 py-3 border-b border-slate-800/50 transition-all hover:bg-slate-800/40 disabled:opacity-40 ${simProspect?.id === p.id ? "bg-violet-500/10 border-l-2 border-l-violet-500" : ""}`}>
                    <span className="text-base flex-shrink-0 mt-0.5">{p.score ?? "·"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-slate-500 text-[10px] truncate">{p.city}</p>
                      {p.phone
                        ? <p className="text-emerald-400 text-[10px] font-mono">{p.phone}</p>
                        : <p className="text-slate-700 text-[10px] italic">Sans numéro</p>
                      }
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone UI */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
              {!simProspect ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-5xl">🤖</div>
                  <div>
                    <p className="text-white font-black text-xl">Max — Agent Nova Tech</p>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm">
                      Choisissez un prospect à gauche. Max va vous appeler — vous jouez le rôle du restaurateur.
                      Testez votre pitch avant les vrais appels !
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>🎙️ Micro supporté</span>
                    <span>•</span>
                    <span>🔊 Voix IA activée</span>
                    <span>•</span>
                    <span>🤖 Perplexity IA</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Phone header */}
                  <div className={`flex-shrink-0 px-5 py-4 border-b border-slate-800 flex items-center gap-3 transition-all ${simState === "active" ? "bg-red-500/5 border-red-500/20" : simState === "ringing" ? "bg-amber-500/5 border-amber-500/20" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-base truncate">{simProspect.name}</p>
                      <p className="text-slate-400 text-xs">
                        {simProspect.city}
                        {simProspect.category && ` · ${simProspect.category}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {simState === "active" && (
                        <span className="font-mono text-red-400 font-bold text-sm">{fmt(simTimer)}</span>
                      )}
                      {simState === "active" && (
                        <button onClick={() => setVoiceOn(v => !v)}
                          title={voiceOn ? "Couper la voix" : "Activer la voix"}
                          className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all ${voiceOn ? "border-violet-500/40 bg-violet-500/15 text-violet-400" : "border-slate-700 bg-slate-900 text-slate-500"}`}>
                          {voiceOn ? "🔊" : "🔇"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* State screens */}
                  {simState === "idle" && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                      <div className="text-center space-y-2">
                        <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-4xl mx-auto">
                          {simProspect.score ?? "🍽️"}
                        </div>
                        <p className="text-white font-black text-lg">{simProspect.name}</p>
                        <p className="text-slate-400 text-sm">{simProspect.city}</p>
                        {simProspect.phone && (
                          <p className="text-emerald-400 font-mono text-sm">{simProspect.phone}</p>
                        )}
                        {simProspect.score && (
                          <span className="text-xs px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">
                            {simProspect.autoScoreLabel ?? "Prospect"}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-center">
                        <p className="text-slate-500 text-xs">
                          Max va appeler ce prospect.<br />Vous jouerez le rôle du restaurateur.
                        </p>
                        <button
                          onClick={startSim}
                          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center gap-3 mx-auto">
                          <span className="text-2xl">📞</span> Lancer la simulation
                        </button>
                      </div>
                    </div>
                  )}

                  {simState === "ringing" && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-5xl animate-pulse">
                          🤖
                        </div>
                        <div className="absolute -inset-3 rounded-full border border-emerald-500/20 animate-ping" />
                        <div className="absolute -inset-6 rounded-full border border-emerald-500/10 animate-ping" style={{ animationDelay: "0.3s" }} />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-white font-black text-lg">Max vous appelle…</p>
                        <p className="text-slate-400 text-sm">Vous êtes le restaurateur — décrochez !</p>
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {(simState === "active" || simState === "ended") && (
                    <div className="flex flex-col flex-1 overflow-hidden">
                      {/* Messages */}
                      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {/* Context bar */}
                        <div className="flex items-center gap-2 justify-center mb-2">
                          <div className="h-px flex-1 bg-slate-800" />
                          <span className="text-[10px] text-slate-600 px-2">Simulation démarrée</span>
                          <div className="h-px flex-1 bg-slate-800" />
                        </div>

                        {simMessages.map((msg, i) => (
                          <div key={i} className={`flex gap-2.5 ${msg.role === "max" ? "justify-start" : "justify-end"}`}>
                            {msg.role === "max" && (
                              <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>
                            )}
                            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              msg.role === "max"
                                ? "bg-violet-500/15 border border-violet-500/20 text-violet-100 rounded-tl-sm"
                                : "bg-slate-700 text-white rounded-tr-sm"
                            }`}>
                              {msg.text}
                            </div>
                            {msg.role === "user" && (
                              <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">👤</div>
                            )}
                          </div>
                        ))}

                        {simLoading && (
                          <div className="flex gap-2.5 justify-start">
                            <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                            <div className="bg-violet-500/10 border border-violet-500/15 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Outcome selector (ended state) */}
                      {simState === "ended" && (
                        <div className="flex-shrink-0 px-4 py-4 border-t border-slate-800 bg-slate-900/80 space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Résultat de la simulation</p>
                          <div className="grid grid-cols-2 gap-2">
                            {OUTCOMES.map(o => (
                              <button key={o.id} onClick={() => { setSimOutcome(o.id); }}
                                className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${simOutcome === o.id ? o.cls : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                                {o.emoji} {o.label}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => { setSimState("idle"); setSimMessages([]); setSimInput(""); setSimTimer(0); setSimProspect(null); }}
                            className="w-full py-2.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-bold hover:bg-violet-500/30 transition-colors">
                            ✅ Terminer & choisir un autre prospect
                          </button>
                        </div>
                      )}

                      {/* Input (active state) */}
                      {simState === "active" && (
                        <div className="flex-shrink-0 px-4 py-4 border-t border-slate-800 space-y-2">
                          <p className="text-[10px] text-slate-600 text-center">Vous êtes le restaurateur — répondez à Max</p>
                          <div className="flex gap-2">
                            <input
                              value={simInput}
                              onChange={e => setSimInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleSend()}
                              placeholder="Votre réponse (Allô ?, je ne suis pas intéressé…)"
                              disabled={simLoading}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                            />
                            <button onClick={toggleMic}
                              className={`flex-shrink-0 w-10 h-10 rounded-xl border transition-all flex items-center justify-center ${micOn ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"}`}>
                              {micOn ? "🔴" : "🎙️"}
                            </button>
                            <button onClick={handleSend} disabled={simLoading || !simInput.trim()}
                              className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white flex items-center justify-center transition-all">
                              ↑
                            </button>
                          </div>
                          <div className="flex justify-center">
                            <button onClick={() => endSim()}
                              className="px-4 py-2 bg-red-500/15 border border-red-500/25 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/25 transition-colors">
                              📵 Raccrocher
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AUTO CALLS ───────────────────────────────────────── */}
        {section === "auto" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">📡 Appels Automatiques</h2>
              <p className="text-slate-400 text-sm mt-0.5">Max appelle vos prospects en autonomie via Vapi.ai</p>
            </div>

            {!cfg.hasVapi ? (
              /* No Vapi key */
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
                <p className="text-amber-400 font-black text-lg">⚠️ Configuration Vapi requise</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Pour les appels téléphoniques automatiques, vous avez besoin d'un compte <strong className="text-white">Vapi.ai</strong>.
                </p>
                <div className="space-y-2 text-sm text-slate-400">
                  <p>1. Créez un compte sur <a href="https://vapi.ai" target="_blank" rel="noopener" className="text-violet-400 hover:underline">vapi.ai</a> (~0,05$/min)</p>
                  <p>2. Achetez un numéro de téléphone dans le dashboard Vapi</p>
                  <p>3. Copiez votre API Key et Phone Number ID</p>
                  <p>4. Configurez-les dans l'onglet <button onClick={() => setSection("config")} className="text-violet-400 hover:underline">⚙️ Config</button></p>
                </div>
                <div className="flex gap-3">
                  <a href="https://vapi.ai" target="_blank" rel="noopener"
                    className="px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-bold transition-colors">
                    → Créer un compte Vapi
                  </a>
                  <button onClick={() => setSection("config")}
                    className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:border-slate-500 transition-colors">
                    ⚙️ Configurer
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Queue results */}
                {autoQueue.length > 0 && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <p className="text-sm font-bold text-white">File d'appels en cours</p>
                      <div className="flex gap-2 text-xs text-slate-400">
                        <span className="text-emerald-400">{autoQueue.filter(q => q.status === "done").length} terminés</span>
                        <span>{autoQueue.filter(q => q.status === "error").length} erreurs</span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                      {autoQueue.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-sm">
                            {item.status === "pending" ? "⏳" : item.status === "calling" ? <span className="animate-pulse">📞</span> : item.status === "done" ? "✅" : "❌"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{item.prospect.name}</p>
                            <p className="text-slate-500 text-xs">{item.prospect.phone}</p>
                          </div>
                          {item.callId && (
                            <p className="text-slate-600 text-[10px] font-mono truncate max-w-[100px]">{item.callId.slice(0, 8)}…</p>
                          )}
                          {item.error && (
                            <p className="text-red-400 text-xs">{item.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection */}
                <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Sélectionner les prospects à appeler</p>
                      <p className="text-xs text-slate-400 mt-0.5">{autoProspects.length} prospects avec numéro · {autoSelected.size} sélectionnés</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={selectAllAuto}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg hover:border-slate-500 transition-colors">
                        {autoSelected.size === autoProspects.length ? "Désélectionner tout" : "Tout sélectionner"}
                      </button>
                      <button
                        onClick={launchAutoCalls}
                        disabled={autoRunning || autoSelected.size === 0}
                        className="px-4 py-1.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                        {autoRunning
                          ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />En cours…</>
                          : `📡 Lancer ${autoSelected.size} appel${autoSelected.size > 1 ? "s" : ""}`}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                    {autoProspects.length === 0 ? (
                      <p className="text-center text-slate-500 text-sm py-8">Aucun prospect avec numéro de téléphone</p>
                    ) : autoProspects.map(p => (
                      <label key={p.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-800/40 ${autoSelected.has(p.id) ? "bg-violet-500/5" : ""}`}>
                        <input
                          type="checkbox"
                          checked={autoSelected.has(p.id)}
                          onChange={() => toggleAutoSelect(p.id)}
                          className="w-4 h-4 accent-violet-500 flex-shrink-0"
                        />
                        <span className="text-base flex-shrink-0">{p.score ?? "·"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                          <p className="text-slate-400 text-xs">{p.city} {p.category && `· ${p.category}`}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-emerald-400 text-xs font-mono">{p.phone}</p>
                          {p.google_rating && <p className="text-yellow-400 text-[10px]">{p.google_rating}★</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {autoRunning && (
                  <div className="flex items-center justify-center">
                    <button onClick={() => { autoAbortRef.current = true; setAutoRunning(false); }}
                      className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-colors">
                      ⏹ Arrêter la file d'appels
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── HISTORY ──────────────────────────────────────────── */}
        {section === "history" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">📊 Historique des appels</h2>
                <p className="text-slate-400 text-sm mt-0.5">{history.length} sessions enregistrées</p>
              </div>
              {history.length > 0 && (
                <button onClick={() => { if (confirm("Effacer tout l'historique ?")) { saveHistory([]); } }}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition-colors">
                  🗑 Effacer
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-slate-400 font-bold">Aucun appel enregistré</p>
                <p className="text-slate-600 text-sm mt-1">Lancez une simulation pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(log => {
                  const outcome = OUTCOMES.find(o => o.id === log.outcome);
                  const isExpanded = expandedLog === log.id;
                  return (
                    <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                      <button
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-800/40 transition-colors">
                        <span className="text-2xl flex-shrink-0">{log.type === "sim" ? "🧪" : "📡"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{log.prospectName}</p>
                          <p className="text-slate-400 text-xs">{log.prospectCity} · {new Date(log.startedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {log.durationSec && (
                            <span className="text-slate-500 text-xs font-mono">{fmt(log.durationSec)}</span>
                          )}
                          {outcome && (
                            <span className={`text-xs px-2 py-1 rounded-lg border font-bold ${outcome.cls}`}>
                              {outcome.emoji} {outcome.label}
                            </span>
                          )}
                          <span className="text-slate-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {isExpanded && log.messages.length > 0 && (
                        <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-950/50">
                          {log.messages.map((msg, i) => (
                            <div key={i} className={`flex gap-2 ${msg.role === "max" ? "" : "justify-end"}`}>
                              {msg.role === "max" && <span className="text-xs mt-0.5 flex-shrink-0">🤖</span>}
                              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${msg.role === "max" ? "bg-violet-500/10 text-violet-200" : "bg-slate-700 text-white"}`}>
                                {msg.text}
                              </div>
                              {msg.role === "user" && <span className="text-xs mt-0.5 flex-shrink-0">👤</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIG ───────────────────────────────────────────── */}
        {section === "config" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-black text-white">⚙️ Configuration NovaAgent</h2>
              <p className="text-slate-400 text-sm mt-0.5">Vapi.ai pour les appels · ElevenLabs pour la voix</p>
            </div>

            {/* Vapi section */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-xl">📡</div>
                <div>
                  <p className="text-white font-bold">Vapi.ai — Appels téléphoniques IA</p>
                  <p className="text-slate-400 text-xs">~0,05$/min · <a href="https://vapi.ai" target="_blank" rel="noopener" className="text-violet-400 hover:underline">vapi.ai</a></p>
                </div>
                {cfg.hasVapi && <span className="ml-auto text-emerald-400 text-sm">✅ Configuré</span>}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">API Key Vapi</label>
                  <input
                    type="password"
                    value={cfgEdit.vapiApiKey}
                    onChange={e => setCfgEdit(f => ({ ...f, vapiApiKey: e.target.value }))}
                    placeholder="vapi_XXXXXXXXXXXXXXXXXXXX"
                    className="w-full bg-black/40 border border-slate-700 focus:border-violet-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Phone Number ID</label>
                  <input
                    value={cfgEdit.vapiPhoneNumberId}
                    onChange={e => setCfgEdit(f => ({ ...f, vapiPhoneNumberId: e.target.value }))}
                    placeholder="phone_XXXXXXXXXXXX"
                    className="w-full bg-black/40 border border-slate-700 focus:border-violet-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
                  />
                  <p className="text-slate-600 text-xs mt-1">Trouvez l'ID dans Dashboard Vapi → Phone Numbers</p>
                </div>
              </div>
            </div>

            {/* ElevenLabs section */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-xl">🔊</div>
                <div>
                  <p className="text-white font-bold">ElevenLabs — Voix IA (optionnel)</p>
                  <p className="text-slate-400 text-xs">Voix naturelle pour Max · <a href="https://elevenlabs.io" target="_blank" rel="noopener" className="text-orange-400 hover:underline">elevenlabs.io</a></p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">ElevenLabs Voice ID</label>
                  <input
                    value={cfgEdit.elevenLabsVoiceId}
                    onChange={e => setCfgEdit(f => ({ ...f, elevenLabsVoiceId: e.target.value }))}
                    placeholder="laissez vide pour voix Azure (fr-FR-HenriNeural)"
                    className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
                  />
                  <p className="text-slate-600 text-xs mt-1">Trouvez des voix masculines françaises sur ElevenLabs Voice Library</p>
                </div>
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-400">
                  💡 Sans clé ElevenLabs, Vapi utilisera automatiquement <strong className="text-white">Azure Neural TTS fr-FR-HenriNeural</strong> — qualité très correcte et inclus gratuitement dans Vapi.
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-xs text-slate-400 space-y-2">
              <p className="font-bold text-white text-sm">📋 Guide de setup rapide</p>
              <p>1. Créez un compte <a href="https://vapi.ai" target="_blank" className="text-violet-400">vapi.ai</a> (gratuit pour tester)</p>
              <p>2. Achetez un numéro français dans <strong>Vapi → Phone Numbers → Buy</strong> (~1$/mois)</p>
              <p>3. Copiez votre <strong>Private Key</strong> depuis <strong>Vapi → API Keys</strong></p>
              <p>4. Copiez le <strong>Phone Number ID</strong> depuis votre numéro acheté</p>
              <p>5. Sauvegardez ci-dessus — Max peut appeler vos restaurants automatiquement !</p>
            </div>

            <button
              onClick={saveConfig}
              disabled={cfgSaving}
              className={`w-full py-3 rounded-xl text-sm font-black transition-all ${cfgSaved ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-50"}`}>
              {cfgSaved ? "✅ Sauvegardé !" : cfgSaving ? "Sauvegarde…" : "💾 Sauvegarder la configuration"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
