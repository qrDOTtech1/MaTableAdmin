"use client";

import { useEffect, useRef, useState } from "react";
import type { MapProspect } from "./LeafletMap";

type CallResult = "interested" | "callback" | "voicemail" | "refused" | null;

const RESULTS: { id: CallResult; label: string; emoji: string; color: string }[] = [
  { id: "interested",  label: "Intéressé !",    emoji: "🟢", color: "emerald" },
  { id: "callback",    label: "Rappeler",        emoji: "📅", color: "amber" },
  { id: "voicemail",   label: "Messagerie",      emoji: "📵", color: "blue" },
  { id: "refused",     label: "Pas intéressé",  emoji: "🔴", color: "red" },
];

const RESULT_STATUS: Record<NonNullable<CallResult>, string> = {
  interested: "CONTACTED",
  callback:   "CONTACTED",
  voicemail:  "CONTACTED",
  refused:    "IGNORED",
};

interface Props {
  prospect: MapProspect & {
    autoScore?: number;
    autoScoreEmoji?: string;
    autoScoreLabel?: string;
    autoScoreReasons?: string[];
    reviews_count?: number;
    category?: string;
    description?: string;
  };
  onClose: () => void;
  onSaved?: (updates: { status?: string; notes?: string }) => void;
}

export default function CallModeOverlay({ prospect, onClose, onSaved }: Props) {
  const [script, setScript] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState(true);
  const [notes, setNotes] = useState(prospect.notes ?? "");
  const [result, setResult] = useState<CallResult>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Load script
  useEffect(() => {
    setScriptLoading(true);
    fetch("/api/prospection/call-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: prospect.name,
        city: prospect.city,
        category: prospect.category,
        phone: prospect.phone,
        website: prospect.website,
        google_rating: (prospect as any).google_rating,
        reviews_count: prospect.reviews_count,
        description: prospect.description,
        autoScoreLabel: prospect.autoScoreLabel,
        autoScoreReasons: prospect.autoScoreReasons,
      }),
    })
      .then(r => r.json())
      .then(d => setScript(d.script ?? null))
      .catch(() => setScript(null))
      .finally(() => setScriptLoading(false));
  }, [prospect.name]);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  async function save() {
    if (!prospect.id) return;
    setSaving(true);
    const status = result ? RESULT_STATUS[result] : undefined;
    const notesFinal = notes.trim()
      ? `[${new Date().toLocaleDateString("fr-FR")} — ${RESULTS.find(r => r.id === result)?.label ?? "Appel"}] ${notes.trim()}`
      : undefined;

    await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(status ? { status } : {}),
        ...(notesFinal ? { notes: (prospect.notes ? prospect.notes + "\n" : "") + notesFinal } : {}),
      }),
    }).catch(() => {});

    setSaving(false);
    setSaved(true);
    onSaved?.({ status, notes: notesFinal });
    setTimeout(() => onClose(), 800);
  }

  const phone = prospect.phone;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] bg-slate-950 border border-slate-700 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header bar ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-black text-sm uppercase tracking-wider">Mode Appel</span>
          </span>
          {prospect.autoScoreEmoji && (
            <span className="text-xl">{prospect.autoScoreEmoji}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-base leading-tight truncate">{prospect.name}</p>
            <p className="text-slate-400 text-xs truncate">{prospect.category && `${prospect.category} · `}{prospect.city}</p>
          </div>
          {/* Timer */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`font-mono text-sm font-bold ${timerRunning ? "text-red-400" : "text-slate-500"}`}>
              {formatTime(timer)}
            </span>
            <button
              onClick={() => setTimerRunning(v => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${timerRunning ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
              {timerRunning ? "⏸" : "▶"}
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none flex-shrink-0">✕</button>
        </div>

        {/* ── Call button + info ── */}
        <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex items-center gap-3 flex-wrap flex-shrink-0">
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              onClick={() => { setTimerRunning(true); setTimer(0); }}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl text-base transition-all shadow-lg shadow-emerald-500/30 active:scale-95 flex-shrink-0"
            >
              📞 <span className="font-mono tracking-wide">{phone}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-800 border border-slate-700 text-slate-500 font-bold rounded-xl text-sm">
              📵 Pas de numéro — utiliser ✨ Améliorer les infos
            </div>
          )}

          <div className="flex gap-2 flex-wrap ml-auto">
            {prospect.website && (
              <a href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                target="_blank" rel="noopener"
                className="px-3 py-2 bg-blue-500/15 border border-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/25 transition-colors">
                🌐 Site web
              </a>
            )}
            {prospect.sourceUrl && (
              <a href={prospect.sourceUrl} target="_blank" rel="noopener"
                className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg text-xs hover:border-slate-500 transition-colors">
                🗺️ Google Maps
              </a>
            )}
            {(prospect as any).google_rating && (
              <span className="px-3 py-2 bg-slate-800 border border-slate-700 text-yellow-400 rounded-lg text-xs font-bold">
                ⭐ {(prospect as any).google_rating}★{prospect.reviews_count ? ` · ${prospect.reviews_count} avis` : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── Content: Script + Notes ── */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">

          {/* Script */}
          <div className="flex-1 flex flex-col border-b sm:border-b-0 sm:border-r border-slate-800 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 flex-shrink-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">📋 Script d'appel</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (script) { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
                  className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                  {copied ? "✓ Copié" : "📋 Copier"}
                </button>
                <button
                  onClick={() => { setScript(null); setScriptLoading(true); fetch("/api/prospection/call-script", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: prospect.name, city: prospect.city, category: prospect.category, phone: prospect.phone, website: prospect.website }) }).then(r => r.json()).then(d => setScript(d.script ?? null)).finally(() => setScriptLoading(false)); }}
                  disabled={scriptLoading}
                  className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                  {scriptLoading ? "⏳" : "🔄 Regénérer"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {scriptLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-5/6" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-2/3" />
                  <div className="h-px bg-slate-800 my-4" />
                  <div className="h-3 bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-4/5" />
                </div>
              ) : script ? (
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {script.split("\n").map((line, i) => {
                    if (line.startsWith("📞") || line.startsWith("💡")) {
                      return <p key={i} className="text-orange-400 font-bold text-xs uppercase tracking-wide mt-4 mb-2 first:mt-0">{line}</p>;
                    }
                    if (line.startsWith("•")) {
                      const parts = line.slice(1).split("→");
                      return (
                        <div key={i} className="flex gap-2 mb-2 text-xs">
                          <span className="text-amber-400 font-semibold flex-shrink-0">⚡</span>
                          <div>
                            {parts[0] && <span className="text-slate-400 italic">{parts[0].trim()}</span>}
                            {parts[1] && <><span className="text-slate-600 mx-1">→</span><span className="text-white">{parts[1].trim()}</span></>}
                          </div>
                        </div>
                      );
                    }
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i} className="mb-1">{line}</p>;
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Impossible de charger le script. Vérifiez votre clé Perplexity.</p>
              )}
            </div>
          </div>

          {/* Notes + Result */}
          <div className="w-full sm:w-72 flex-shrink-0 flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 flex-shrink-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">✏️ Notes d'appel</p>
            </div>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Résultat de l'appel, nom du contact, remarques, heure de rappel…"
              className="flex-1 bg-transparent px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none resize-none min-h-[120px]"
            />

            {/* Result buttons */}
            <div className="px-4 py-3 border-t border-slate-800 space-y-2 flex-shrink-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Résultat de l'appel</p>
              <div className="grid grid-cols-2 gap-2">
                {RESULTS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setResult(result === r.id ? null : r.id)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      result === r.id
                        ? r.color === "emerald" ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300"
                        : r.color === "amber" ? "bg-amber-500/25 border-amber-500/50 text-amber-300"
                        : r.color === "blue" ? "bg-blue-500/25 border-blue-500/50 text-blue-300"
                        : "bg-red-500/25 border-red-500/50 text-red-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    <span>{r.emoji}</span> {r.label}
                  </button>
                ))}
              </div>

              <button
                onClick={save}
                disabled={saving || saved}
                className={`w-full py-3 rounded-xl text-sm font-black transition-all ${
                  saved ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                  : "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 disabled:opacity-50"
                }`}
              >
                {saved ? "✅ Sauvegardé !" : saving ? "Sauvegarde…" : "💾 Terminer l'appel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
