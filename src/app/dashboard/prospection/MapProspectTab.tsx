"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { MapProspect } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

type Status = "NEW" | "CONTACTED" | "ACTIVATED" | "IGNORED";
const STATUS_LABEL: Record<Status, string> = { NEW: "Nouveau", CONTACTED: "Contacté", ACTIVATED: "Activé", IGNORED: "Ignoré" };
const STATUS_COLOR: Record<Status, string> = { NEW: "blue", CONTACTED: "amber", ACTIVATED: "emerald", IGNORED: "slate" };
const STATUS_CLASSES: Record<Status, string> = {
  NEW: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  CONTACTED: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ACTIVATED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  IGNORED: "bg-slate-700/40 text-slate-400 border-slate-600/30",
};

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export default function MapProspectTab() {
  const [prospects, setProspects] = useState<MapProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapProspect | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("ALL");

  // Activate modal
  const [activating, setActivating] = useState(false);
  const [activateEmail, setActivateEmail] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateResult, setActivateResult] = useState<{ email: string; password: string; loginUrl: string } | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  // Notes
  const [notesEdit, setNotesEdit] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

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

  async function patchStatus(id: string, status: Status) {
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  async function saveNotes(id: string) {
    setNotesSaving(true);
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesEdit }),
    });
    setProspects(prev => prev.map(p => p.id === id ? { ...p, notes: notesEdit } : p));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, notes: notesEdit } : null);
    setNotesSaving(false);
  }

  async function activate() {
    if (!selected || !activateEmail.trim()) return;
    setActivateLoading(true);
    setActivateError(null);
    try {
      const res = await fetch(`/api/prospects/${selected.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activateEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "email_taken") setActivateError("Cet email est déjà utilisé.");
        else if (json.error === "already_activated") setActivateError("Ce prospect est déjà activé.");
        else setActivateError(json.error ?? "Erreur serveur");
        return;
      }
      setActivateResult(json.credentials);
      // Refresh prospect
      setProspects(prev => prev.map(p =>
        p.id === selected.id ? { ...p, status: "ACTIVATED", restaurantId: json.restaurant.id, slug: json.restaurant.slug } : p
      ));
      setSelected(prev => prev ? { ...prev, status: "ACTIVATED", restaurantId: json.restaurant.id, slug: json.restaurant.slug } : null);
    } catch (e: any) {
      setActivateError(e.message ?? "Erreur inconnue");
    } finally {
      setActivateLoading(false);
    }
  }

  const filtered = filterStatus === "ALL" ? prospects : prospects.filter(p => p.status === filterStatus);

  const stats = {
    NEW: prospects.filter(p => p.status === "NEW").length,
    CONTACTED: prospects.filter(p => p.status === "CONTACTED").length,
    ACTIVATED: prospects.filter(p => p.status === "ACTIVATED").length,
    IGNORED: prospects.filter(p => p.status === "IGNORED").length,
  };

  function openActivate(p: MapProspect) {
    setActivating(true);
    setActivateEmail(`${slugify(p.name)}@matable.pro`);
    setActivateResult(null);
    setActivateError(null);
  }

  function onSelectProspect(p: MapProspect) {
    setSelected(p);
    setNotesEdit(p.notes ?? "");
    setActivating(false);
    setActivateResult(null);
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Map ── */}
      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Chargement de la carte…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Filter chips */}
            <div className="absolute top-4 left-4 z-[1000] flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterStatus === "ALL" ? "bg-white text-slate-900 border-white" : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500 backdrop-blur"}`}
              >
                Tous ({prospects.length})
              </button>
              {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as Status[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s === filterStatus ? "ALL" : s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all backdrop-blur ${filterStatus === s ? STATUS_CLASSES[s] + " !bg-opacity-60" : "bg-slate-900/80 border-slate-700 text-slate-400 hover:border-slate-500"}`}
                >
                  {STATUS_LABEL[s]} ({stats[s]})
                </button>
              ))}
              <button
                onClick={load}
                className="px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 backdrop-blur transition-all"
              >
                🔄
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="text-center">
                  <p className="text-5xl mb-3">🗺️</p>
                  <p className="text-white font-bold">Aucun prospect géolocalisé</p>
                  <p className="text-slate-400 text-sm mt-1">Lancez des circuits de prospection et sauvegardez les résultats.</p>
                </div>
              </div>
            ) : (
              <LeafletMap
                prospects={filtered}
                selected={selected?.id}
                onSelect={onSelectProspect}
              />
            )}
          </>
        )}
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="w-[380px] flex-shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[selected.status as Status] ?? ""}`}>
                    {STATUS_LABEL[selected.status as Status] ?? selected.status}
                  </span>
                  {selected.category && (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">{selected.category}</span>
                  )}
                </div>
                <p className="font-black text-white text-lg leading-tight">{selected.name}</p>
                {selected.address && <p className="text-slate-400 text-xs mt-0.5">📍 {selected.address}</p>}
                {selected.city && <p className="text-slate-500 text-xs">{selected.city}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg flex-shrink-0">✕</button>
            </div>

            {/* Photo */}
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt={selected.name}
                className="w-full h-28 object-cover rounded-lg mt-3 border border-slate-800"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
          </div>

          {/* Scroll content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Contacts */}
            <div className="space-y-2">
              {selected.phone && (
                <a href={`tel:${selected.phone}`}
                  className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors">
                  📞 {selected.phone}
                </a>
              )}
              {selected.website && (
                <a href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`}
                  target="_blank" rel="noopener"
                  className="flex items-center gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm hover:bg-blue-500/20 transition-colors">
                  🌐 {selected.website.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              )}
              {selected.sourceUrl && (
                <a href={selected.sourceUrl} target="_blank" rel="noopener"
                  className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 text-sm hover:border-slate-500 transition-colors">
                  🗺️ Voir sur Maps
                </a>
              )}
            </div>

            {/* Status change */}
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Statut</p>
              <div className="grid grid-cols-2 gap-2">
                {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as Status[]).map(s => (
                  <button
                    key={s}
                    onClick={() => patchStatus(selected.id, s)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      selected.status === s ? STATUS_CLASSES[s] : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Notes</p>
              <textarea
                value={notesEdit}
                onChange={(e) => setNotesEdit(e.target.value)}
                placeholder="Observations, résultat d'appel…"
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500 resize-none"
              />
              <button
                onClick={() => saveNotes(selected.id)}
                disabled={notesSaving}
                className="mt-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
              >
                {notesSaving ? "Sauvegarde…" : "💾 Sauvegarder"}
              </button>
            </div>

            {/* Dashboard link if activated */}
            {selected.status === "ACTIVATED" && selected.slug && (
              <a
                href={`https://matable.pro/${selected.slug}`}
                target="_blank" rel="noopener"
                className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-colors"
              >
                🚀 Accéder au Dashboard
              </a>
            )}

            {/* Create account */}
            {selected.status !== "ACTIVATED" && !activating && !activateResult && (
              <button
                onClick={() => openActivate(selected)}
                className="w-full py-3 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-bold hover:bg-orange-500/25 transition-colors"
              >
                ✨ Créer le compte MaTable
              </button>
            )}

            {/* Activate form */}
            {activating && !activateResult && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
                <p className="text-orange-400 font-bold text-sm">Créer le compte</p>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Email du compte</label>
                  <input
                    value={activateEmail}
                    onChange={(e) => setActivateEmail(e.target.value)}
                    type="email"
                    className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-slate-600 focus:outline-none"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={() => setActivateEmail(`${slugify(selected.name)}@matable.pro`)}
                      className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                      📧 @matable.pro
                    </button>
                    {selected.email && (
                      <button type="button" onClick={() => setActivateEmail(selected.email!)}
                        className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                        📩 {selected.email}
                      </button>
                    )}
                  </div>
                </div>
                {activateError && (
                  <p className="text-red-400 text-xs">{activateError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={activate}
                    disabled={activateLoading || !activateEmail.trim()}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {activateLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création…</> : "✅ Créer le compte"}
                  </button>
                  <button onClick={() => setActivating(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm hover:text-white transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Success */}
            {activateResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <p className="text-emerald-400 font-bold text-sm">✅ Compte créé !</p>
                <div className="space-y-1.5 font-mono text-xs">
                  <p className="text-slate-300">📧 {activateResult.email}</p>
                  <p className="text-slate-300">🔑 {activateResult.password}</p>
                  <p className="text-slate-300">🔗 {activateResult.loginUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(`Email: ${activateResult.email}\nMot de passe: ${activateResult.password}\nLien: ${activateResult.loginUrl}`)}
                    className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    📋 Copier identifiants
                  </button>
                  <a
                    href={activateResult.loginUrl} target="_blank" rel="noopener"
                    className="flex-1 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold text-center hover:bg-emerald-500/30 transition-colors"
                  >
                    🚀 Dashboard
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
