"use client";

import { useEffect, useState, useCallback } from "react";
import CallModeOverlay from "./CallModeOverlay";

type Status = "NEW" | "CONTACTED" | "ACTIVATED" | "IGNORED";

interface Prospect {
  id: string; name: string; city?: string | null; phone?: string | null;
  email?: string | null; address?: string | null; website?: string | null;
  category?: string | null; description?: string | null;
  status: Status; notes?: string | null;
  score?: string | null; imageUrl?: string | null; sourceUrl?: string | null;
  restaurantId?: string | null; slug?: string | null;
  lat?: number | null; lng?: number | null;
  google_rating?: number | null; reviews_count?: number | null;
}

const STATUS_LABEL: Record<Status, string> = {
  NEW: "Nouveau", CONTACTED: "Contacté", ACTIVATED: "Activé", IGNORED: "Ignoré",
};
const STATUS_CLASSES: Record<Status, string> = {
  NEW: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  CONTACTED: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ACTIVATED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  IGNORED: "bg-slate-700/40 text-slate-400 border-slate-600/30",
};
const SCORE_ORDER = ["🔥", "😊", "🤔", "❄️"];

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function CallModeTab() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [callProspect, setCallProspect] = useState<Prospect | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [callCount, setCallCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prospection/map");
      const json = await res.json();
      setProspects(json.prospects ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  // Session timer
  useEffect(() => {
    if (!sessionStarted) return;
    const iv = setInterval(() => setSessionTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [sessionStarted]);

  // Sort: score emoji priority, then status (not IGNORED first), then with phone
  const sorted = [...prospects]
    .filter(p => p.status !== "IGNORED")
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()))
    .filter(p => statusFilter === "ALL" || p.status === statusFilter)
    .sort((a, b) => {
      const sa = SCORE_ORDER.indexOf(a.score ?? "");
      const sb = SCORE_ORDER.indexOf(b.score ?? "");
      const scoreDiff = (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
      if (scoreDiff !== 0) return scoreDiff;
      // Phone presence second
      return (a.phone ? 0 : 1) - (b.phone ? 0 : 1);
    });

  const withPhone = sorted.filter(p => p.phone).length;
  const stats = {
    NEW: prospects.filter(p => p.status === "NEW").length,
    CONTACTED: prospects.filter(p => p.status === "CONTACTED").length,
    hot: prospects.filter(p => p.score === "🔥").length,
    withPhone: prospects.filter(p => p.phone).length,
  };

  async function patch(id: string, data: Record<string, any>) {
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setProspects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...data } : null);
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: call list ── */}
      <div className="w-[340px] flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden bg-slate-950">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-800 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Mode Appel
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">{sorted.length} prospects · {withPhone} avec numéro</p>
            </div>
            <button onClick={load} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-sm">🔄</button>
          </div>

          {/* Session widget */}
          <div className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${sessionStarted ? "border-red-500/30 bg-red-500/5" : "border-slate-800 bg-slate-900"}`}>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-semibold">Session d'appels</p>
              <p className="text-white font-mono text-lg font-bold">{formatTime(sessionTimer)}</p>
            </div>
            <div className="text-center flex-shrink-0">
              <p className="text-2xl font-black text-orange-400">{callCount}</p>
              <p className="text-[10px] text-slate-500">appels</p>
            </div>
            <button
              onClick={() => { setSessionStarted(v => !v); if (!sessionStarted) { setCallCount(0); setSessionTimer(0); } }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${sessionStarted ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"}`}>
              {sessionStarted ? "⏸ Pause" : "▶ Démarrer"}
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-1.5">
            {[
              { label: `🔥 ${stats.hot}`, title: "Très chauds" },
              { label: `📞 ${stats.withPhone}`, title: "Avec numéro" },
              { label: `🆕 ${stats.NEW}`, title: "Nouveaux" },
              { label: `✅ ${stats.CONTACTED}`, title: "Contactés" },
            ].map(s => (
              <div key={s.title} title={s.title} className="flex-1 text-center py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300">
                {s.label}
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Chercher…"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
          <div className="flex gap-1">
            {(["ALL", "NEW", "CONTACTED"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${statusFilter === s ? "bg-slate-700 text-white border-slate-600" : "border-slate-800 text-slate-500 hover:text-white"}`}>
                {s === "ALL" ? "Tous" : STATUS_LABEL[s as Status]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-slate-400 text-sm">Aucun prospect actif</p>
              <p className="text-slate-600 text-xs mt-1">Lancez des circuits et sauvegardez des prospects</p>
            </div>
          ) : sorted.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
              className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-slate-800/50 transition-all hover:bg-slate-800/40 ${selected?.id === p.id ? "bg-orange-500/8 border-l-2 border-l-orange-500" : ""}`}
            >
              {/* Rank */}
              <span className="text-slate-600 text-xs w-5 text-right flex-shrink-0 font-mono">{i + 1}</span>

              {/* Score emoji */}
              <span className="text-base flex-shrink-0 w-6 text-center">{p.score ?? "·"}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-tight">{p.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {p.city && <span className="text-slate-500 text-[10px]">📍 {p.city}</span>}
                  {p.category && <span className="text-slate-600 text-[10px] hidden sm:inline">· {p.category}</span>}
                </div>
                {p.phone
                  ? <p className="text-emerald-400 text-[10px] font-mono mt-0.5">{p.phone}</p>
                  : <p className="text-slate-600 text-[10px] mt-0.5 italic">Pas de numéro</p>
                }
              </div>

              {/* Status */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
                {/* Quick call button */}
                <button
                  onClick={e => { e.stopPropagation(); setCallProspect(p); setCallCount(c => c + 1); }}
                  disabled={!p.phone}
                  className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${p.phone ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30" : "bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed"}`}>
                  📞
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: prospect detail ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex-shrink-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {selected.score && <span className="text-2xl">{selected.score}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[selected.status]}`}>
                      {STATUS_LABEL[selected.status]}
                    </span>
                    {selected.category && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">{selected.category}</span>
                    )}
                  </div>
                  <p className="text-xl font-black text-white">{selected.name}</p>
                  {selected.city && <p className="text-slate-400 text-sm">📍 {selected.address ?? selected.city}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg flex-shrink-0">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* BIG CALL BUTTON */}
              <button
                onClick={() => { setCallProspect(selected); setCallCount(c => c + 1); }}
                disabled={!selected.phone}
                className={`w-full py-5 rounded-2xl text-lg font-black transition-all flex items-center justify-center gap-3 ${
                  selected.phone
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 active:scale-95"
                    : "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed"
                }`}>
                <span className="w-3 h-3 bg-white/30 rounded-full animate-pulse" />
                {selected.phone ? `📞 Entrer en Mode Appel — ${selected.phone}` : "📵 Pas de numéro de téléphone"}
              </button>

              {!selected.phone && (
                <p className="text-center text-slate-500 text-sm">
                  Utilisez <strong className="text-violet-400">✨ Améliorer les infos via IA</strong> dans la Carte Globale pour trouver le numéro.
                </p>
              )}

              {/* Quick status */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Changer le statut</p>
                <div className="flex gap-2 flex-wrap">
                  {(["NEW", "CONTACTED", "IGNORED"] as Status[]).map(s => (
                    <button key={s} onClick={() => patch(selected.id, { status: s })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selected.status === s ? STATUS_CLASSES[s] : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"}`}>
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info grid */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
                {[
                  { icon: "📞", label: "Téléphone", value: selected.phone, href: selected.phone ? `tel:${selected.phone}` : undefined },
                  { icon: "🌐", label: "Site web", value: selected.website, href: selected.website },
                  { icon: "🗺️", label: "Google Maps", value: selected.sourceUrl ? "Voir sur Maps" : null, href: selected.sourceUrl },
                  { icon: "📊", label: "Note Google", value: selected.google_rating ? `${selected.google_rating}★ (${selected.reviews_count ?? "?"} avis)` : null },
                  { icon: "📝", label: "Description", value: selected.description },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-sm w-4 flex-shrink-0 mt-0.5">{row.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{row.label}</p>
                      {row.href ? (
                        <a href={row.href} target="_blank" rel="noopener"
                          className="text-sm text-orange-400 hover:underline truncate block">{row.value}</a>
                      ) : (
                        <p className="text-sm text-white">{row.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Notes</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-4xl">📞</div>
            <div>
              <p className="text-white font-black text-xl">Mode Appel</p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                Sélectionnez un prospect dans la liste pour voir ses informations et lancer un appel.
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-600 text-xs">
              <span className="w-2 h-2 rounded-full bg-orange-500" />Les 🔥 en haut, les sans numéro en bas
            </div>
          </div>
        )}
      </div>

      {/* ── Call Mode Overlay ── */}
      {callProspect && (
        <CallModeOverlay
          prospect={callProspect}
          onClose={() => setCallProspect(null)}
          onSaved={({ status, notes }) => {
            const updates: any = {};
            if (status) updates.status = status;
            if (notes) updates.notes = notes;
            setProspects(prev => prev.map(p => p.id === callProspect.id ? { ...p, ...updates } : p));
            if (selected?.id === callProspect.id) setSelected(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}
    </div>
  );
}
