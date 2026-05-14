"use client";

import { useEffect, useRef, useState } from "react";

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
  transcript?: string; summary?: string;
}
interface VapiConfig {
  vapiApiKey: string | null; vapiPhoneNumberId: string | null;
  vapiAssistantId: string | null; elevenLabsVoiceId: string | null; hasVapi: boolean;
}
interface RealCallState {
  callId: string; status: "dialing" | "ringing" | "in-progress" | "ended" | "error";
  startedAt: number; durationSec: number;
  transcript?: string; summary?: string; endedReason?: string; cost?: number;
}

type Section = "sim" | "auto" | "history" | "config";
type CallMode = "sim" | "real";

const SCORE_ORDER = ["🔥", "😊", "🤔", "❄️"];
const OUTCOMES = [
  { id: "interested", label: "Intéressé !",  emoji: "🟢", cls: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  { id: "callback",   label: "Rappeler",      emoji: "📅", cls: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
  { id: "voicemail",  label: "Messagerie",    emoji: "📵", cls: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  { id: "refused",    label: "Refusé",        emoji: "🔴", cls: "bg-red-500/20 border-red-500/40 text-red-300" },
];
const VAPI_STATUS_LABEL: Record<string, string> = {
  dialing: "Composition…", ringing: "Ça sonne…",
  "in-progress": "En communication", ended: "Appel terminé", error: "Erreur",
};

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NovaAgentTab() {
  const [section, setSection]     = useState<Section>("sim");
  const [callMode, setCallMode]   = useState<CallMode>("sim");
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [loadingP, setLoadingP]   = useState(true);
  const [prospectSearch, setProspectSearch] = useState("");

  // Config
  const [cfg, setCfg]     = useState<VapiConfig>({ vapiApiKey: null, vapiPhoneNumberId: null, vapiAssistantId: null, elevenLabsVoiceId: null, hasVapi: false });
  const [cfgEdit, setCfgEdit] = useState({ vapiApiKey: "", vapiPhoneNumberId: "", elevenLabsVoiceId: "" });
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgSaved, setCfgSaved]   = useState(false);

  // Simulation
  const [simProspect, setSimProspect] = useState<ProspectItem | null>(null);
  const [simState, setSimState]       = useState<"idle" | "ringing" | "active" | "ended">("idle");
  const [simMessages, setSimMessages] = useState<ChatMsg[]>([]);
  const [simInput, setSimInput]       = useState("");
  const [simLoading, setSimLoading]   = useState(false);
  const [simOutcome, setSimOutcome]   = useState<string | null>(null);
  const [simStartTime, setSimStartTime] = useState(0);
  const [simTimer, setSimTimer]         = useState(0);
  const [voiceOn, setVoiceOn]   = useState(true);
  const [micOn, setMicOn]       = useState(false);
  const timerRef   = useRef<any>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const recogRef    = useRef<any>(null);

  // Real call
  const [realCall, setRealCall]     = useState<RealCallState | null>(null);
  const [realOutcome, setRealOutcome] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  // Auto call queue
  const [autoSelected, setAutoSelected] = useState<Set<string>>(new Set());
  const [autoQueue, setAutoQueue]         = useState<{ prospect: ProspectItem; status: "pending" | "calling" | "done" | "error"; callId?: string; error?: string }[]>([]);
  const [autoRunning, setAutoRunning]     = useState(false);
  const autoAbortRef = useRef(false);

  // History
  const [history, setHistory]       = useState<CallLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => { loadProspects(); loadConfig(); loadHistory(); }, []);

  // Sim timer
  useEffect(() => {
    if (simState === "active") {
      timerRef.current = setInterval(() => setSimTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (simState === "idle") setSimTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [simState]);

  // Real call timer
  useEffect(() => {
    if (!realCall || realCall.status === "ended" || realCall.status === "error") return;
    const iv = setInterval(() => {
      setRealCall(prev => prev ? { ...prev, durationSec: Math.floor((Date.now() - prev.startedAt) / 1000) } : null);
    }, 1000);
    return () => clearInterval(iv);
  }, [realCall?.status]);

  // Auto-scroll sim messages
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [simMessages]);

  // ── Data ────────────────────────────────────────────────────────────────────
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
      setCfgEdit({ vapiApiKey: json.vapiApiKey ?? "", vapiPhoneNumberId: json.vapiPhoneNumberId ?? "", elevenLabsVoiceId: json.elevenLabsVoiceId ?? "" });
    } catch {}
  }

  function loadHistory() {
    try { const s = localStorage.getItem("nova-calls"); if (s) setHistory(JSON.parse(s)); } catch {}
  }

  function pushHistory(log: CallLog) {
    const next = [log, ...history].slice(0, 100);
    setHistory(next);
    localStorage.setItem("nova-calls", JSON.stringify(next));
  }

  async function saveConfig() {
    setCfgSaving(true);
    try {
      await fetch("/api/nova-agent/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfgEdit) });
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
    u.lang = "fr-FR"; u.rate = 1.05; u.pitch = 0.85;
    const fr = window.speechSynthesis?.getVoices().find(v => v.lang.startsWith("fr-FR") && /male|homme|Henri/i.test(v.name))
      ?? window.speechSynthesis?.getVoices().find(v => v.lang.startsWith("fr")) ?? null;
    if (fr) u.voice = fr;
    window.speechSynthesis?.speak(u);
  }

  async function startSim() {
    if (!simProspect) return;
    setSimState("ringing"); setSimMessages([]); setSimOutcome(null); setSimTimer(0);
    setTimeout(async () => {
      setSimState("active"); setSimStartTime(Date.now());
      await callMax([], true);
    }, 2200);
  }

  async function callMax(msgs: ChatMsg[], isFirst = false) {
    setSimLoading(true);
    try {
      const res = await fetch("/api/nova-agent/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect: simProspect,
          messages: msgs.map(m => ({ role: m.role === "max" ? "assistant" : "user", content: m.text })),
          isFirst,
        }),
      });
      const { reply } = await res.json();
      const msg: ChatMsg = { role: "max", text: reply, ts: Date.now() };
      setSimMessages(prev => [...prev, msg]);
      speak(reply);
    } catch {
      setSimMessages(prev => [...prev, { role: "max", text: "… (erreur réseau)", ts: Date.now() }]);
    }
    setSimLoading(false);
  }

  async function handleSend() {
    if (!simInput.trim() || simLoading || simState !== "active") return;
    const text = simInput.trim(); setSimInput("");
    const userMsg: ChatMsg = { role: "user", text, ts: Date.now() };
    const next = [...simMessages, userMsg];
    setSimMessages(next);
    await callMax(next, false);
  }

  function toggleMic() {
    if (micOn) { recogRef.current?.stop(); setMicOn(false); return; }
    const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
    if (!SR) { alert("Microphone non supporté — utilisez Chrome."); return; }
    const r = new SR();
    r.lang = "fr-FR"; r.continuous = false; r.interimResults = false;
    r.onresult = (e: any) => { setSimInput(e.results[0]?.[0]?.transcript ?? ""); setMicOn(false); };
    r.onend = r.onerror = () => setMicOn(false);
    recogRef.current = r; r.start(); setMicOn(true);
  }

  function endSim(outcome?: string) {
    window.speechSynthesis?.cancel(); recogRef.current?.stop(); setMicOn(false); setSimState("ended");
    if (outcome) setSimOutcome(outcome);
    pushHistory({ id: Date.now().toString(), type: "sim", prospectName: simProspect!.name, prospectCity: simProspect!.city, startedAt: new Date(simStartTime).toISOString(), endedAt: new Date().toISOString(), durationSec: simTimer, outcome: outcome ?? simOutcome ?? null, messages: simMessages });
  }

  function resetSim() {
    window.speechSynthesis?.cancel(); setSimState("idle"); setSimMessages([]); setSimInput(""); setSimOutcome(null); setSimTimer(0);
  }

  // ── Real Call ────────────────────────────────────────────────────────────────
  async function launchRealCall() {
    if (!simProspect || !cfg.hasVapi) return;
    setRealCall({ callId: "", status: "dialing", startedAt: Date.now(), durationSec: 0 });
    setRealOutcome(null);
    try {
      const res = await fetch("/api/nova-agent/call", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect: simProspect }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Erreur Vapi");
      setRealCall(prev => prev ? { ...prev, callId: json.callId, status: "ringing" } : null);
      startPolling(json.callId);
    } catch (e: any) {
      setRealCall(prev => prev ? { ...prev, status: "error", endedReason: e.message } : null);
    }
  }

  function startPolling(callId: string) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/nova-agent/call?callId=${callId}`);
        const json = await res.json();
        if (!res.ok) return;
        const mapped: RealCallState["status"] =
          json.status === "ended" ? "ended"
          : json.status === "in-progress" ? "in-progress"
          : json.status === "ringing" ? "ringing"
          : json.status === "error" || json.status === "failed" ? "error"
          : "dialing";
        setRealCall(prev => prev ? { ...prev, status: mapped, transcript: json.transcript, summary: json.summary, endedReason: json.endedReason, cost: json.cost } : null);
        if (mapped === "ended" || mapped === "error") {
          clearInterval(pollRef.current);
          if (mapped === "ended") {
            pushHistory({ id: callId, type: "real", prospectName: simProspect!.name, prospectCity: simProspect!.city, startedAt: new Date().toISOString(), vapiCallId: callId, messages: [], transcript: json.transcript, summary: json.summary });
          }
        }
      } catch {}
    }, 3000);
  }

  function stopRealCall() {
    clearInterval(pollRef.current);
    setRealCall(null);
    setRealOutcome(null);
  }

  // ── Auto calls ──────────────────────────────────────────────────────────────
  const autoProspects = prospects.filter(p => p.phone && p.status !== "IGNORED" && p.status !== "ACTIVATED")
    .sort((a, b) => (SCORE_ORDER.indexOf(a.score ?? "") === -1 ? 99 : SCORE_ORDER.indexOf(a.score ?? "")) - (SCORE_ORDER.indexOf(b.score ?? "") === -1 ? 99 : SCORE_ORDER.indexOf(b.score ?? "")));

  function toggleAutoSelect(id: string) {
    setAutoSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function launchAutoCalls() {
    const toCall = autoProspects.filter(p => autoSelected.has(p.id));
    if (!toCall.length || !cfg.hasVapi) return;
    setAutoRunning(true); autoAbortRef.current = false;
    const queue = toCall.map(p => ({ prospect: p, status: "pending" as const }));
    setAutoQueue(queue);
    for (let i = 0; i < queue.length; i++) {
      if (autoAbortRef.current) break;
      setAutoQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: "calling" } : item));
      try {
        const res = await fetch("/api/nova-agent/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospect: queue[i].prospect }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Erreur");
        setAutoQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: "done", callId: json.callId } : item));
        pushHistory({ id: json.callId ?? Date.now().toString(), type: "real", prospectName: queue[i].prospect.name, prospectCity: queue[i].prospect.city, startedAt: new Date().toISOString(), vapiCallId: json.callId, messages: [] });
        if (i < queue.length - 1) await new Promise(r => setTimeout(r, 4000));
      } catch (e: any) {
        setAutoQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: "error", error: e.message } : item));
      }
    }
    setAutoRunning(false);
  }

  // ── Computed ─────────────────────────────────────────────────────────────────
  const simProspects = prospects
    .filter(p => !prospectSearch || p.name.toLowerCase().includes(prospectSearch.toLowerCase()) || p.city?.toLowerCase().includes(prospectSearch.toLowerCase()))
    .sort((a, b) => (SCORE_ORDER.indexOf(a.score ?? "") === -1 ? 99 : SCORE_ORDER.indexOf(a.score ?? "")) - (SCORE_ORDER.indexOf(b.score ?? "") === -1 ? 99 : SCORE_ORDER.indexOf(b.score ?? "")));

  const SECTIONS: { id: Section; label: string; emoji: string }[] = [
    { id: "sim",     label: "Mode Appel",  emoji: "📞" },
    { id: "auto",    label: "Auto Queue",  emoji: "📡" },
    { id: "history", label: "Historique",  emoji: "📊" },
    { id: "config",  label: "Config",      emoji: "⚙️" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-52 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col py-4 gap-1">
        <div className="px-4 mb-5">
          <div className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-500/15 to-violet-500/5 p-3 text-center">
            <p className="text-3xl mb-1">🤖</p>
            <p className="text-white font-black text-sm">NovaAgent<span className="text-violet-400">Com</span></p>
            <p className="text-violet-300/60 text-[10px] mt-0.5">MAX · Agent commercial IA</p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 flex-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${section === s.id ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-slate-400 hover:text-white hover:bg-slate-800/60"}`}>
              <span className="text-base">{s.emoji}</span>{s.label}
            </button>
          ))}
        </nav>

        <div className="px-4">
          <div className={`rounded-lg border p-2.5 text-center transition-all ${cfg.hasVapi ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-700 bg-slate-900"}`}>
            <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${cfg.hasVapi ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            <p className={`text-[10px] font-bold ${cfg.hasVapi ? "text-emerald-400" : "text-slate-500"}`}>
              {cfg.hasVapi ? "Vapi · Appels réels ON" : "Simulation uniquement"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">

        {/* ══════════════════════════════════════════════════════
            MODE APPEL (Sim + Réel)
        ══════════════════════════════════════════════════════ */}
        {section === "sim" && (
          <div className="flex h-full overflow-hidden">

            {/* Prospect picker */}
            <div className="w-64 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
              <div className="px-3 py-3 border-b border-slate-800 space-y-2 flex-shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospect</p>
                <input value={prospectSearch} onChange={e => setProspectSearch(e.target.value)}
                  placeholder="🔍 Rechercher…"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-violet-500" />
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingP ? (
                  <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
                ) : simProspects.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8 px-3">Aucun prospect sauvegardé</p>
                ) : simProspects.map(p => (
                  <button key={p.id}
                    onClick={() => { setSimProspect(p); resetSim(); setRealCall(null); setRealOutcome(null); stopRealCall(); }}
                    disabled={simState === "active" || simState === "ringing"}
                    className={`w-full text-left flex items-start gap-2 px-3 py-3 border-b border-slate-800/50 transition-all hover:bg-slate-800/40 disabled:opacity-40 ${simProspect?.id === p.id ? "bg-violet-500/10 border-l-2 border-l-violet-500" : ""}`}>
                    <span className="text-base flex-shrink-0 mt-0.5">{p.score ?? "·"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-slate-500 text-[10px] truncate">{p.city}</p>
                      {p.phone ? <p className="text-emerald-400 text-[10px] font-mono">{p.phone}</p>
                        : <p className="text-slate-700 text-[10px] italic">Sans numéro</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone panel */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900/90">

              {!simProspect ? (
                /* No prospect selected */
                <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-5xl">🤖</div>
                  <div>
                    <p className="text-white font-black text-xl">Max — Nova Tech</p>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm leading-relaxed">
                      Sélectionnez un prospect. En <strong className="text-violet-400">simulation</strong>, vous jouez le restaurateur et Max IA vous répond.
                      En mode <strong className="text-emerald-400">réel</strong>, Max appelle vraiment le numéro via Vapi.
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>🎙️ Micro support</span><span>•</span>
                    <span>🔊 Voix IA</span><span>•</span>
                    <span>{cfg.hasVapi ? "📡 Vapi actif" : "🧪 Simulation"}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">

                  {/* ── Header with SIM/REAL toggle ── */}
                  <div className="flex-shrink-0 px-5 py-4 border-b border-slate-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-base truncate">{simProspect.name}</p>
                        <p className="text-slate-400 text-xs">{simProspect.city}{simProspect.category && ` · ${simProspect.category}`}</p>
                        {simProspect.phone && <p className="text-emerald-400 text-xs font-mono">{simProspect.phone}</p>}
                      </div>
                      {(simState === "active") && (
                        <span className="font-mono text-red-400 font-bold text-sm flex-shrink-0">{fmt(simTimer)}</span>
                      )}
                      {(realCall?.status === "in-progress") && (
                        <span className="font-mono text-red-400 font-bold text-sm flex-shrink-0">{fmt(realCall.durationSec)}</span>
                      )}
                    </div>

                    {/* ── SIM / RÉEL SWITCH ── */}
                    <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
                      <button onClick={() => { setCallMode("sim"); stopRealCall(); resetSim(); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${callMode === "sim" ? "bg-violet-500/25 text-violet-300 border border-violet-500/30" : "text-slate-500 hover:text-white"}`}>
                        <span>🧪</span> Simulation
                      </button>
                      <button
                        onClick={() => { if (!cfg.hasVapi) { setSection("config"); return; } setCallMode("real"); resetSim(); }}
                        title={!cfg.hasVapi ? "Configurez Vapi dans ⚙️ Config" : ""}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all relative ${
                          callMode === "real" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : !cfg.hasVapi ? "text-slate-600 cursor-not-allowed"
                          : "text-slate-400 hover:text-white"}`}>
                        <span>{cfg.hasVapi ? "📡" : "🔒"}</span> Réel
                        {cfg.hasVapi && callMode !== "real" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        )}
                        {!cfg.hasVapi && (
                          <span className="text-[9px] text-amber-500 ml-1">Config requis</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ══════════════════════════════════════
                      SIMULATION MODE
                  ══════════════════════════════════════ */}
                  {callMode === "sim" && (
                    <>
                      {simState === "idle" && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                          <div className="text-center space-y-2">
                            <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-4xl mx-auto">
                              {simProspect.score ?? "🍽️"}
                            </div>
                            <p className="text-white font-black text-lg">{simProspect.name}</p>
                            <p className="text-slate-400 text-sm">{simProspect.city}</p>
                            {simProspect.autoScoreLabel && (
                              <span className="text-xs px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">{simProspect.autoScoreLabel}</span>
                            )}
                          </div>
                          <div className="space-y-2 text-center max-w-xs">
                            <p className="text-slate-500 text-xs leading-relaxed">
                              Max va appeler — vous jouez le restaurateur.<br />
                              Testez le pitch avant les vrais appels.
                            </p>
                            <button onClick={startSim}
                              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center gap-3 mx-auto">
                              <span className="text-2xl">📞</span> Simuler l'appel
                            </button>
                          </div>
                        </div>
                      )}

                      {simState === "ringing" && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6">
                          <div className="relative">
                            <div className="w-28 h-28 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-5xl animate-pulse">🤖</div>
                            <div className="absolute -inset-3 rounded-full border border-emerald-500/20 animate-ping" />
                            <div className="absolute -inset-7 rounded-full border border-emerald-500/10 animate-ping" style={{ animationDelay: "0.35s" }} />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-white font-black text-xl">Max vous appelle…</p>
                            <p className="text-slate-400 text-sm">Vous êtes le restaurateur 👤</p>
                          </div>
                          <div className="flex gap-1.5">
                            {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                          </div>
                        </div>
                      )}

                      {(simState === "active" || simState === "ended") && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                          {/* Messages */}
                          <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="h-px flex-1 bg-slate-800" />
                              <span className="text-[10px] text-slate-600 px-2 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                Simulation en cours
                              </span>
                              <div className="h-px flex-1 bg-slate-800" />
                            </div>
                            {simMessages.map((msg, i) => (
                              <div key={i} className={`flex gap-2.5 ${msg.role === "max" ? "" : "justify-end"}`}>
                                {msg.role === "max" && <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>}
                                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "max" ? "bg-violet-500/15 border border-violet-500/20 text-violet-100 rounded-tl-sm" : "bg-slate-700 text-white rounded-tr-sm"}`}>
                                  {msg.text}
                                </div>
                                {msg.role === "user" && <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">👤</div>}
                              </div>
                            ))}
                            {simLoading && (
                              <div className="flex gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-sm">🤖</div>
                                <div className="bg-violet-500/10 border border-violet-500/15 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Ended: outcome */}
                          {simState === "ended" && (
                            <div className="flex-shrink-0 px-4 py-4 border-t border-slate-800 bg-slate-900/80 space-y-3">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Résultat de l'appel</p>
                              <div className="grid grid-cols-2 gap-2">
                                {OUTCOMES.map(o => (
                                  <button key={o.id} onClick={() => { setSimOutcome(o.id); endSim(o.id); }}
                                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${simOutcome === o.id ? o.cls : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                                    {o.emoji} {o.label}
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => { resetSim(); setSimProspect(null); }}
                                className="w-full py-2.5 bg-violet-500/15 border border-violet-500/25 text-violet-300 rounded-xl text-sm font-bold hover:bg-violet-500/25 transition-colors">
                                ✅ Terminer & nouveau prospect
                              </button>
                            </div>
                          )}

                          {/* Active: input */}
                          {simState === "active" && (
                            <div className="flex-shrink-0 px-4 py-3 border-t border-slate-800 space-y-2">
                              <p className="text-[10px] text-slate-600 text-center">Vous êtes le restaurateur 👤 — répondez à Max</p>
                              <div className="flex gap-2">
                                <input value={simInput} onChange={e => setSimInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
                                  placeholder="Allô ?, pas intéressé, c'est quoi votre tarif…" disabled={simLoading}
                                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500 disabled:opacity-50" />
                                <button onClick={toggleMic}
                                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${micOn ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"}`}>
                                  {micOn ? "🔴" : "🎙️"}
                                </button>
                                <button onClick={() => setVoiceOn(v => !v)} title={voiceOn ? "Couper voix Max" : "Activer voix Max"}
                                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${voiceOn ? "border-violet-500/40 bg-violet-500/15 text-violet-400" : "border-slate-700 bg-slate-900 text-slate-500"}`}>
                                  {voiceOn ? "🔊" : "🔇"}
                                </button>
                                <button onClick={handleSend} disabled={simLoading || !simInput.trim()}
                                  className="w-10 h-10 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white flex items-center justify-center transition-all text-lg font-bold">
                                  ↑
                                </button>
                              </div>
                              <div className="flex justify-center">
                                <button onClick={() => endSim()}
                                  className="px-4 py-1.5 bg-red-500/15 border border-red-500/25 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/25 transition-colors">
                                  📵 Raccrocher
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* ══════════════════════════════════════
                      RÉEL MODE (Vapi)
                  ══════════════════════════════════════ */}
                  {callMode === "real" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {!realCall ? (
                        /* Ready to call */
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-emerald-500/40 flex items-center justify-center text-4xl">
                              {simProspect.score ?? "🍽️"}
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center">
                              <span className="text-xs">🤖</span>
                            </div>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-white font-black text-xl">{simProspect.name}</p>
                            <p className="text-slate-400 text-sm">{simProspect.phone ?? "⚠️ Pas de numéro"}</p>
                            {simProspect.autoScoreLabel && <p className="text-slate-500 text-xs">{simProspect.autoScoreLabel}</p>}
                          </div>
                          <div className="space-y-3 w-full max-w-xs text-center">
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300 leading-relaxed space-y-1">
                              <p className="font-bold">📡 Appel réel via Vapi.ai</p>
                              <p className="text-emerald-400/70">Max va composer le <strong>{simProspect.phone}</strong> et conduire l'entretien en autonomie.</p>
                            </div>
                            <button onClick={launchRealCall} disabled={!simProspect.phone}
                              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-3">
                              <span className="text-2xl">📡</span> Lancer l'appel IA
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Call in progress or ended */
                        <div className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto">
                          {/* Status card */}
                          <div className={`rounded-2xl border p-5 transition-all ${
                            realCall.status === "in-progress" ? "border-red-500/40 bg-red-500/5"
                            : realCall.status === "ended"      ? "border-emerald-500/30 bg-emerald-500/5"
                            : realCall.status === "error"      ? "border-red-500/30 bg-red-500/5"
                            : "border-amber-500/30 bg-amber-500/5"
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl flex-shrink-0 ${
                                realCall.status === "in-progress" ? "border-red-500/60 bg-red-500/10 animate-pulse"
                                : realCall.status === "ended"    ? "border-emerald-500/60 bg-emerald-500/10"
                                : "border-amber-500/60 bg-amber-500/10"
                              }`}>
                                {realCall.status === "in-progress" ? "📞" : realCall.status === "ended" ? "✅" : realCall.status === "error" ? "❌" : "🔔"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-black text-base">{VAPI_STATUS_LABEL[realCall.status]}</p>
                                <p className="text-slate-400 text-sm">{simProspect.name}</p>
                                {realCall.status === "in-progress" && (
                                  <p className="text-red-400 font-mono text-lg font-bold">{fmt(realCall.durationSec)}</p>
                                )}
                                {realCall.endedReason && (
                                  <p className="text-slate-500 text-xs mt-0.5">{realCall.endedReason}</p>
                                )}
                              </div>
                              {realCall.cost !== undefined && (
                                <div className="text-right flex-shrink-0">
                                  <p className="text-slate-500 text-[10px]">Coût</p>
                                  <p className="text-white font-bold text-sm">${realCall.cost.toFixed(3)}</p>
                                </div>
                              )}
                            </div>

                            {/* Call ID */}
                            {realCall.callId && (
                              <p className="text-slate-700 text-[10px] font-mono mt-2 truncate">ID: {realCall.callId}</p>
                            )}

                            {/* Polling indicator */}
                            {(realCall.status === "dialing" || realCall.status === "ringing" || realCall.status === "in-progress") && (
                              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                                <div className="flex gap-1">
                                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                                </div>
                                Mise à jour automatique toutes les 3s…
                              </div>
                            )}
                          </div>

                          {/* Transcript */}
                          {realCall.transcript && (
                            <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                              <div className="px-4 py-2 border-b border-slate-800">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">📝 Transcription en direct</p>
                              </div>
                              <div className="p-4 max-h-48 overflow-y-auto">
                                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{realCall.transcript}</p>
                              </div>
                            </div>
                          )}

                          {/* Summary */}
                          {realCall.summary && (
                            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                              <p className="text-xs font-bold text-violet-400 uppercase tracking-wide mb-2">🤖 Résumé IA de l'appel</p>
                              <p className="text-sm text-slate-300 leading-relaxed">{realCall.summary}</p>
                            </div>
                          )}

                          {/* Outcome + actions */}
                          {realCall.status === "ended" && (
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Résultat</p>
                              <div className="grid grid-cols-2 gap-2">
                                {OUTCOMES.map(o => (
                                  <button key={o.id} onClick={() => setRealOutcome(o.id)}
                                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${realOutcome === o.id ? o.cls : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                                    {o.emoji} {o.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { setRealCall(null); setRealOutcome(null); }}
                                  className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:border-slate-500 transition-colors">
                                  ← Nouvel appel
                                </button>
                                {realOutcome && (
                                  <button onClick={() => { setRealCall(null); setSimProspect(null); }}
                                    className="flex-1 py-2.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-bold">
                                    ✅ Suivant
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {realCall.status === "error" && (
                            <button onClick={() => { setRealCall(null); }}
                              className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold">
                              ← Réessayer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            AUTO QUEUE
        ══════════════════════════════════════════════════════ */}
        {section === "auto" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">📡 File d'appels automatiques</h2>
              <p className="text-slate-400 text-sm mt-0.5">Max appelle tous vos prospects sélectionnés en séquence</p>
            </div>
            {!cfg.hasVapi ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
                <p className="text-amber-400 font-black text-lg">⚠️ Vapi.ai requis pour les appels réels</p>
                <p className="text-slate-300 text-sm">Créez un compte sur <a href="https://vapi.ai" target="_blank" className="text-violet-400 underline">vapi.ai</a>, achetez un numéro français, puis configurez dans <button onClick={() => setSection("config")} className="text-violet-400 underline">⚙️ Config</button>.</p>
                <div className="flex gap-3">
                  <a href="https://vapi.ai" target="_blank" rel="noopener" className="px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-bold">→ Vapi.ai</a>
                  <button onClick={() => setSection("config")} className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold">⚙️ Configurer</button>
                </div>
              </div>
            ) : (
              <>
                {autoQueue.length > 0 && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <p className="text-sm font-bold text-white">File en cours</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-emerald-400">{autoQueue.filter(q => q.status === "done").length} ✅</span>
                        <span className="text-red-400">{autoQueue.filter(q => q.status === "error").length} ❌</span>
                        <span className="text-amber-400">{autoQueue.filter(q => q.status === "calling").length} 📞</span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                      {autoQueue.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <span>{item.status === "pending" ? "⏳" : item.status === "calling" ? <span className="animate-pulse">📞</span> : item.status === "done" ? "✅" : "❌"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{item.prospect.name}</p>
                            <p className="text-slate-500 text-xs">{item.prospect.phone}</p>
                          </div>
                          {item.error && <p className="text-red-400 text-xs">{item.error}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{autoProspects.length} prospects avec numéro · <span className="text-violet-400">{autoSelected.size} sélectionnés</span></p>
                    <div className="flex gap-2">
                      <button onClick={() => setAutoSelected(autoSelected.size === autoProspects.length ? new Set() : new Set(autoProspects.map(p => p.id)))}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg hover:border-slate-500">
                        {autoSelected.size === autoProspects.length ? "Désélectionner" : "Tout"}
                      </button>
                      <button onClick={launchAutoCalls} disabled={autoRunning || autoSelected.size === 0}
                        className="px-4 py-1.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                        {autoRunning ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />En cours…</> : `📡 Lancer ${autoSelected.size} appel${autoSelected.size > 1 ? "s" : ""}`}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                    {autoProspects.map(p => (
                      <label key={p.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors ${autoSelected.has(p.id) ? "bg-violet-500/5" : ""}`}>
                        <input type="checkbox" checked={autoSelected.has(p.id)} onChange={() => toggleAutoSelect(p.id)} className="w-4 h-4 accent-violet-500 flex-shrink-0" />
                        <span className="text-base flex-shrink-0">{p.score ?? "·"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                          <p className="text-slate-400 text-xs">{p.city}{p.category && ` · ${p.category}`}</p>
                        </div>
                        <p className="text-emerald-400 text-xs font-mono flex-shrink-0">{p.phone}</p>
                      </label>
                    ))}
                  </div>
                </div>
                {autoRunning && (
                  <button onClick={() => { autoAbortRef.current = true; setAutoRunning(false); }}
                    className="w-full py-3 bg-red-500/15 border border-red-500/25 text-red-400 rounded-xl text-sm font-bold">
                    ⏹ Arrêter la file
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            HISTORIQUE
        ══════════════════════════════════════════════════════ */}
        {section === "history" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">📊 Historique</h2>
                <p className="text-slate-400 text-sm">{history.length} sessions · {history.filter(h => h.type === "sim").length} simulations · {history.filter(h => h.type === "real").length} réels</p>
              </div>
              {history.length > 0 && (
                <button onClick={() => { if (confirm("Effacer tout ?")) { setHistory([]); localStorage.removeItem("nova-calls"); } }}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  🗑 Effacer
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="text-center py-16"><p className="text-4xl mb-3">📋</p><p className="text-slate-400 font-bold">Aucun appel enregistré</p></div>
            ) : history.map(log => {
              const outcome = OUTCOMES.find(o => o.id === log.outcome);
              return (
                <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <button onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-800/40">
                    <span className="text-2xl">{log.type === "sim" ? "🧪" : "📡"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{log.prospectName}</p>
                      <p className="text-slate-400 text-xs">{log.prospectCity} · {new Date(log.startedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {log.durationSec && <span className="text-slate-500 text-xs font-mono">{fmt(log.durationSec)}</span>}
                      {outcome && <span className={`text-xs px-2 py-1 rounded-lg border font-bold ${outcome.cls}`}>{outcome.emoji} {outcome.label}</span>}
                      <span className="text-slate-600 text-xs">{expandedLog === log.id ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {expandedLog === log.id && (
                    <div className="border-t border-slate-800 bg-slate-950/50 p-4 space-y-3">
                      {log.summary && <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 text-sm text-slate-300">{log.summary}</div>}
                      {log.transcript && <div className="rounded-lg bg-slate-900 p-3 text-xs text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto">{log.transcript}</div>}
                      {log.messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "max" ? "" : "justify-end"}`}>
                          {msg.role === "max" && <span className="text-xs mt-0.5">🤖</span>}
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${msg.role === "max" ? "bg-violet-500/10 text-violet-200" : "bg-slate-700 text-white"}`}>{msg.text}</div>
                          {msg.role === "user" && <span className="text-xs mt-0.5">👤</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            CONFIG
        ══════════════════════════════════════════════════════ */}
        {section === "config" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl">
            <div>
              <h2 className="text-xl font-black text-white">⚙️ Configuration</h2>
              <p className="text-slate-400 text-sm">Vapi.ai · Numéro téléphone · Voix IA</p>
            </div>

            {/* ── Clarification SIP vs Réel ── */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/40">
                <p className="text-white font-bold text-sm">❓ Free Vapi SIP vs numéro réel — quelle différence ?</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {/* SIP */}
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔌</span>
                    <p className="text-white font-bold text-sm">Free Vapi SIP</p>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold">GRATUIT</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li className="flex gap-1.5"><span className="text-emerald-400 flex-shrink-0">✅</span>Parfait pour tester dans le navigateur</li>
                    <li className="flex gap-1.5"><span className="text-emerald-400 flex-shrink-0">✅</span>Test de l'agent Max sans dépenser</li>
                    <li className="flex gap-1.5"><span className="text-red-400 flex-shrink-0">❌</span><span>Ne peut <strong className="text-white">PAS</strong> appeler un 06/07/02 réel</span></li>
                    <li className="flex gap-1.5"><span className="text-red-400 flex-shrink-0">❌</span>VoIP uniquement (SIP-to-SIP)</li>
                  </ul>
                  <p className="text-[10px] text-slate-600 italic">→ La simulation navigateur fonctionne déjà sans ça.</p>
                </div>
                {/* Twilio */}
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📞</span>
                    <p className="text-white font-bold text-sm">Numéro Twilio</p>
                    <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/25 text-violet-300 rounded font-bold">RECOMMANDÉ</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li className="flex gap-1.5"><span className="text-emerald-400 flex-shrink-0">✅</span>Appelle de vrais numéros français</li>
                    <li className="flex gap-1.5"><span className="text-emerald-400 flex-shrink-0">✅</span>Max appelle vos restaurants réels</li>
                    <li className="flex gap-1.5"><span className="text-emerald-400 flex-shrink-0">✅</span>15$ de crédit offert à l'inscription</li>
                    <li className="flex gap-1.5"><span className="text-slate-400 flex-shrink-0">💶</span>~1,5€/mois numéro + ~0,013€/min</li>
                  </ul>
                  <p className="text-[10px] text-violet-400 font-semibold">→ C'est ce qu'il vous faut pour le mode Réel.</p>
                </div>
              </div>
            </div>

            {/* ── Guide Twilio ── */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-3">
                <span className="text-xl">🛠️</span>
                <div>
                  <p className="text-white font-bold text-sm">Setup en 5 minutes — Twilio + Vapi</p>
                  <p className="text-slate-500 text-xs">Pour appeler de vrais restaurants français avec Max</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[
                  {
                    step: "1", color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                    title: "Créer un compte Twilio gratuit",
                    desc: "15$ de crédit offert — largement suffisant pour commencer",
                    link: { label: "→ twilio.com/try-twilio", href: "https://www.twilio.com/try-twilio" },
                  },
                  {
                    step: "2", color: "bg-violet-500/20 text-violet-300 border-violet-500/30",
                    title: "Acheter un numéro français",
                    desc: 'Dashboard Twilio → Phone Numbers → Manage → Buy a number → Pays : France 🇫🇷 → cherchez un 07XXXXXXXX (~1,5€/mois)',
                  },
                  {
                    step: "3", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    title: "Importer dans Vapi",
                    desc: 'Dashboard Vapi → Phone Numbers → Import Twilio → collez Account SID + Auth Token + le numéro',
                    link: { label: "→ dashboard.vapi.ai/phone-numbers", href: "https://dashboard.vapi.ai/phone-numbers" },
                  },
                  {
                    step: "4", color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
                    title: "Copier le Phone Number ID",
                    desc: 'Dans Vapi, cliquez sur votre numéro importé → copiez le champ "ID" (commence par phone_...)',
                  },
                  {
                    step: "5", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    title: "Coller ci-dessous + sauvegarder",
                    desc: "API Key Vapi + Phone Number ID → bouton 💾 — le mode Réel s'active automatiquement !",
                  },
                ].map(s => (
                  <div key={s.step} className="flex gap-3 items-start">
                    <span className={`w-7 h-7 rounded-full border text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${s.color}`}>{s.step}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{s.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                      {s.link && <a href={s.link.href} target="_blank" rel="noopener" className="text-violet-400 text-xs hover:underline">{s.link.label}</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── API Keys form ── */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-xl">🔑</div>
                <div className="flex-1">
                  <p className="text-white font-bold">Vos clés API</p>
                  <p className="text-slate-400 text-xs">Stockées en base, jamais exposées au navigateur</p>
                </div>
                {cfg.hasVapi && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Actif
                  </div>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">API Key Vapi <span className="text-red-400">*</span></label>
                  <input type="password" value={cfgEdit.vapiApiKey}
                    onChange={e => setCfgEdit(p => ({ ...p, vapiApiKey: e.target.value }))}
                    placeholder="vapi_XXXXXXXXXXXXXXXX"
                    className="w-full bg-black/40 border border-slate-700 focus:border-violet-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none" />
                  <p className="text-slate-600 text-[10px] mt-1">Dashboard Vapi → API Keys → <strong>Private Key</strong></p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Phone Number ID (Twilio importé) <span className="text-red-400">*</span></label>
                  <input value={cfgEdit.vapiPhoneNumberId}
                    onChange={e => setCfgEdit(p => ({ ...p, vapiPhoneNumberId: e.target.value }))}
                    placeholder="phone_XXXXXXXXXXXXXXXX"
                    className="w-full bg-black/40 border border-slate-700 focus:border-violet-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none" />
                  <p className="text-slate-600 text-[10px] mt-1">Vapi → Phone Numbers → votre numéro importé → champ ID</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">ElevenLabs Voice ID <span className="text-slate-600 text-[10px]">(optionnel)</span></label>
                  <input value={cfgEdit.elevenLabsVoiceId}
                    onChange={e => setCfgEdit(p => ({ ...p, elevenLabsVoiceId: e.target.value }))}
                    placeholder="Vide = voix Azure fr-FR-HenriNeural (incluse gratuitement dans Vapi)"
                    className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none" />
                  <p className="text-slate-600 text-[10px] mt-1">Sans ça, Vapi utilise Azure Neural TTS — qualité très correcte et inclus gratuitement</p>
                </div>
              </div>
            </div>

            <button onClick={saveConfig} disabled={cfgSaving}
              className={`w-full py-3.5 rounded-xl text-sm font-black transition-all ${cfgSaved ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-violet-500 hover:bg-violet-400 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"}`}>
              {cfgSaved ? "✅ Sauvegardé — mode Réel activé !" : cfgSaving ? "Sauvegarde…" : "💾 Sauvegarder la configuration"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
