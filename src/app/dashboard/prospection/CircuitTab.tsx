"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CircuitRestaurant } from "@/app/api/prospection/circuit/route";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

type Mode = "surplace" | "telephone";
type Status = "NEW" | "CONTACTED" | "ACTIVATED" | "IGNORED";
type View = "list" | "map";

const STATUS_LABEL: Record<Status, string> = { NEW: "Nouveau", CONTACTED: "Contacté", ACTIVATED: "Activé", IGNORED: "Ignoré" };
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

// Prospect as saved in DB (may have id + status)
interface SavedProspect {
  id: string;
  status: Status;
  restaurantId?: string | null;
  slug?: string | null;
  notes?: string | null;
}

function StarDisplay({ rating }: { rating?: number | null }) {
  if (!rating) return <span className="text-slate-600 text-xs">—</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < full ? "text-yellow-400" : i === full && half ? "text-yellow-400/60" : "text-slate-600"}`} viewBox="0 0 20 20" fill="currentColor">
          <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" />
        </svg>
      ))}
      <span className="text-xs text-slate-400 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function RestaurantCard({
  r, index, mode, selected, onSelect, savedProspect, onStatusChange, onActivate,
}: {
  r: CircuitRestaurant;
  index: number;
  mode: Mode;
  selected: boolean;
  onSelect: () => void;
  savedProspect?: SavedProspect | null;
  onStatusChange?: (status: Status) => void;
  onActivate?: () => void;
}) {
  const mapsUrl = r.google_maps_url || (r.lat && r.lng
    ? `https://www.google.com/maps?q=${r.lat},${r.lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(r.name + " " + r.address)}`);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 cursor-pointer transition-all hover:border-slate-500 ${
        selected ? "border-orange-500/60 bg-orange-500/5" : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex items-start gap-3">
        {mode === "surplace" && (
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            {index + 1}
          </div>
        )}
        <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
          {r.photo_url ? (
            <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="font-bold text-white text-sm leading-tight">{r.name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {savedProspect && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[savedProspect.status]}`}>
                  {STATUS_LABEL[savedProspect.status]}
                </span>
              )}
              {r.category && (
                <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">{r.category}</span>
              )}
            </div>
          </div>

          <StarDisplay rating={r.google_rating} />
          {r.reviews_count && <span className="text-[10px] text-slate-500 ml-1">({r.reviews_count} avis)</span>}
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate"><span>📍</span>{r.address}</p>
          {r.description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{r.description}</p>}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {r.phone && (
              <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors font-semibold">
                📞 {r.phone}
              </a>
            )}
            {r.website && (
              <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-colors">
                🌐 Site
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-500 transition-colors">
              🗺️ Maps
            </a>
          </div>

          {/* Actions quick si sauvegardé */}
          {savedProspect && selected && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2" onClick={(e) => e.stopPropagation()}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Statut</p>
              <div className="flex gap-1.5 flex-wrap">
                {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as Status[]).map(s => (
                  <button key={s} onClick={() => onStatusChange?.(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      savedProspect.status === s ? STATUS_CLASSES[s] : "border-slate-700 text-slate-500 hover:border-slate-500"
                    }`}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {savedProspect.status === "ACTIVATED" && savedProspect.slug ? (
                <a href={`https://matable.pro/${savedProspect.slug}`} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/25 transition-colors">
                  🚀 Accéder au Dashboard
                </a>
              ) : savedProspect.status !== "ACTIVATED" && (
                <button onClick={onActivate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-bold hover:bg-orange-500/25 transition-colors">
                  ✨ Créer le compte MaTable
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CircuitTab() {
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<Mode>("surplace");
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<CircuitRestaurant[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [savedCity, setSavedCity] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; skipped: number } | null>(null);

  // Map prospects (after save, to get IDs + status)
  const [savedProspects, setSavedProspects] = useState<Record<string, SavedProspect>>({});

  // Activate modal
  const [activatingIdx, setActivatingIdx] = useState<number | null>(null);
  const [activateEmail, setActivateEmail] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateResult, setActivateResult] = useState<{ email: string; password: string; loginUrl: string } | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  async function search() {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    setRestaurants([]);
    setSelected(null);
    setSaveResult(null);
    setSavedProspects({});
    try {
      const res = await fetch("/api/prospection/circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), mode }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "no_key") {
          setError("⚠️ Clé API Perplexity non configurée — rendez-vous dans ⚙️ Paramètres pour l'ajouter.");
        } else {
          setError(json.message ?? json.error ?? "Erreur serveur");
        }
        return;
      }
      setRestaurants(json.restaurants ?? []);
      setSavedCity(city.trim());
      setSearched(true);
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function saveSearch() {
    if (restaurants.length === 0) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/prospection/circuit/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurants, searchCity: savedCity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur");
      setSaveResult({ saved: json.saved, skipped: json.skipped });
      // Load prospects from map API to get IDs + status
      loadSavedProspects();
    } catch (e: any) {
      setError(e.message ?? "Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function loadSavedProspects() {
    try {
      const res = await fetch("/api/prospection/map");
      const json = await res.json();
      const map: Record<string, SavedProspect> = {};
      for (const p of json.prospects ?? []) {
        map[p.name.toLowerCase()] = { id: p.id, status: p.status, restaurantId: p.restaurantId, slug: p.slug, notes: p.notes };
      }
      setSavedProspects(map);
    } catch {}
  }

  function getSavedProspect(r: CircuitRestaurant): SavedProspect | null {
    return savedProspects[r.name.toLowerCase()] ?? null;
  }

  async function patchStatus(r: CircuitRestaurant, status: Status) {
    const sp = getSavedProspect(r);
    if (!sp) return;
    await fetch(`/api/prospects/${sp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSavedProspects(prev => ({ ...prev, [r.name.toLowerCase()]: { ...sp, status } }));
  }

  function openActivate(idx: number) {
    const r = restaurants[idx];
    setActivatingIdx(idx);
    setActivateEmail(`${slugify(r.name)}@matable.pro`);
    setActivateResult(null);
    setActivateError(null);
    setSelected(idx);
  }

  async function activate() {
    if (activatingIdx === null || !activateEmail.trim()) return;
    const r = restaurants[activatingIdx];
    const sp = getSavedProspect(r);
    if (!sp) return;
    setActivateLoading(true);
    setActivateError(null);
    try {
      const res = await fetch(`/api/prospects/${sp.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activateEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "email_taken") setActivateError("Email déjà utilisé.");
        else if (json.error === "already_activated") setActivateError("Déjà activé.");
        else setActivateError(json.error ?? "Erreur serveur");
        return;
      }
      setActivateResult(json.credentials);
      setSavedProspects(prev => ({
        ...prev,
        [r.name.toLowerCase()]: { ...sp, status: "ACTIVATED", restaurantId: json.restaurant.id, slug: json.restaurant.slug },
      }));
    } catch (e: any) {
      setActivateError(e.message ?? "Erreur inconnue");
    } finally {
      setActivateLoading(false);
    }
  }

  function buildItineraryUrl() {
    const withGeo = restaurants.filter(r => r.lat && r.lng);
    if (withGeo.length === 0) return null;
    const origin = `${withGeo[0].lat},${withGeo[0].lng}`;
    const dest = `${withGeo[withGeo.length - 1].lat},${withGeo[withGeo.length - 1].lng}`;
    const waypoints = withGeo.slice(1, -1).slice(0, 8).map(r => `${r.lat},${r.lng}`).join("|");
    const base = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origin}&destination=${dest}`;
    return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base;
  }

  const itineraryUrl = mode === "surplace" ? buildItineraryUrl() : null;
  const withPhone = restaurants.filter(r => r.phone).length;
  const withWebsite = restaurants.filter(r => r.website).length;
  const avgRating = restaurants.filter(r => r.google_rating).reduce((s, r) => s + r.google_rating!, 0) / (restaurants.filter(r => r.google_rating).length || 1);

  // Map prospects for LeafletMap
  const mapProspects = restaurants
    .filter(r => r.lat && r.lng)
    .map(r => ({
      id: getSavedProspect(r)?.id ?? r.name,
      name: r.name,
      city: r.city,
      address: r.address,
      phone: r.phone,
      website: r.website,
      category: r.category,
      description: r.description,
      imageUrl: r.photo_url,
      sourceUrl: r.google_maps_url,
      status: getSavedProspect(r)?.status ?? "NEW",
      restaurantId: getSavedProspect(r)?.restaurantId ?? null,
      slug: getSavedProspect(r)?.slug ?? null,
      lat: r.lat!,
      lng: r.lng!,
    }));

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="p-6 border-b border-slate-800 flex-shrink-0 space-y-5">
        <div>
          <h2 className="text-2xl font-black text-white">🗺️ Circuits de Prospection</h2>
          <p className="text-slate-400 text-sm mt-0.5">Recherche IA des restaurants à prospecter — via Perplexity Sonar</p>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
          {([
            { id: "surplace", label: "🚶 Sur place" },
            { id: "telephone", label: "📞 Téléphone" },
          ] as { id: Mode; label: string }[]).map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${mode === m.id ? "bg-orange-500 text-white shadow" : "text-slate-400 hover:text-white"}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <input
            type="text" value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Nom d'une ville (ex: Lyon, Bordeaux, Nice…)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 text-sm"
          />
          <button onClick={search} disabled={loading || !city.trim()}
            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center gap-2 min-w-[140px] justify-center">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Recherche IA…</>
              : <><span>🔍</span> Lancer la recherche</>}
          </button>
        </div>

        <div className={`rounded-xl border p-3 text-xs ${mode === "surplace" ? "border-orange-500/30 bg-orange-500/5 text-orange-300" : "border-blue-500/30 bg-blue-500/5 text-blue-300"}`}>
          {mode === "surplace"
            ? "🚶 Mode Sur place : restaurants ordonnés selon un itinéraire optimal à pied. Bouton Google Maps disponible."
            : "📞 Mode Téléphone : liste ordonnée avec numéros en accès direct. Cliquez pour appeler."}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex-shrink-0">
            {error}
          </div>
        )}

        {loading && (
          <div className="overflow-y-auto flex-1 p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-1/3" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                    <div className="h-3 bg-slate-800 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !searched && !error && (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-white font-bold text-lg mb-2">Créez votre circuit de prospection</p>
            <p className="text-slate-400 text-sm max-w-sm">
              Entrez une ville et choisissez votre mode. Perplexity recherche en temps réel les restaurants indépendants à prospecter.
            </p>
          </div>
        )}

        {!loading && searched && restaurants.length > 0 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Stats bar */}
            <div className="px-6 pt-4 pb-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-bold text-white">{restaurants.length} restaurants — <span className="text-orange-400">{savedCity}</span></span>
                <div className="flex gap-3 text-xs text-slate-400">
                  {withPhone > 0 && <span>📞 {withPhone}</span>}
                  {withWebsite > 0 && <span>🌐 {withWebsite}</span>}
                  {avgRating > 0 && <span>⭐ {avgRating.toFixed(1)}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View toggle */}
                <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <button onClick={() => setView("list")}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${view === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>
                    ☰ Liste
                  </button>
                  <button onClick={() => setView("map")}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${view === "map" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                    disabled={mapProspects.length === 0}>
                    🗺️ Carte
                  </button>
                </div>

                {/* Save button */}
                {!saveResult ? (
                  <button onClick={saveSearch} disabled={saving}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5">
                    {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sauvegarde…</> : "💾 Sauvegarder la recherche"}
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-bold px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    ✅ {saveResult.saved} sauvegardés · {saveResult.skipped} existants
                  </span>
                )}

                {itineraryUrl && (
                  <a href={itineraryUrl} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-xl transition-colors">
                    🗺️ Itinéraire Maps
                  </a>
                )}
                <button
                  onClick={() => {
                    const lines = restaurants.map((r, i) => `${i + 1}. ${r.name} | ${r.address} | ${r.phone ?? "—"} | ${r.website ?? "—"} | ${r.google_rating ?? "—"}★`).join("\n");
                    navigator.clipboard.writeText(lines);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 text-xs transition-colors">
                  📋 Copier
                </button>
              </div>
            </div>

            {/* Map view */}
            {view === "map" && (
              <div className="flex-1 p-4">
                <LeafletMap
                  prospects={mapProspects}
                  onSelect={(p) => {
                    const idx = restaurants.findIndex(r => r.name === p.name);
                    if (idx >= 0) setSelected(idx);
                  }}
                />
              </div>
            )}

            {/* List view */}
            {view === "list" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {/* Activate modal */}
                {activatingIdx !== null && !activateResult && (
                  <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
                    <p className="text-orange-400 font-bold text-sm">✨ Créer le compte — {restaurants[activatingIdx]?.name}</p>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs text-slate-400">Email du compte</label>
                        <input value={activateEmail} onChange={(e) => setActivateEmail(e.target.value)} type="email"
                          className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder-slate-600 focus:outline-none" />
                      </div>
                      <button onClick={() => setActivateEmail(`${slugify(restaurants[activatingIdx]?.name ?? "")}@matable.pro`)}
                        className="px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors flex-shrink-0">
                        @matable.pro
                      </button>
                    </div>
                    {activateError && <p className="text-red-400 text-xs">{activateError}</p>}
                    <div className="flex gap-2">
                      <button onClick={activate} disabled={activateLoading || !activateEmail.trim()}
                        className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {activateLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création…</> : "✅ Créer le compte"}
                      </button>
                      <button onClick={() => setActivatingIdx(null)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm hover:text-white transition-colors">Annuler</button>
                    </div>
                  </div>
                )}

                {/* Activate success */}
                {activateResult && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                    <p className="text-emerald-400 font-bold text-sm">✅ Compte créé !</p>
                    <div className="font-mono text-xs space-y-1 text-slate-300">
                      <p>📧 {activateResult.email}</p>
                      <p>🔑 {activateResult.password}</p>
                      <p>🔗 {activateResult.loginUrl}</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => navigator.clipboard.writeText(`Email: ${activateResult.email}\nMot de passe: ${activateResult.password}\nLien: ${activateResult.loginUrl}`)}
                        className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-colors">📋 Copier</button>
                      <a href={activateResult.loginUrl} target="_blank" rel="noopener"
                        className="flex-1 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold text-center hover:bg-emerald-500/30 transition-colors">🚀 Dashboard</a>
                      <button onClick={() => { setActivateResult(null); setActivatingIdx(null); }}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 hover:text-white transition-colors">✕</button>
                    </div>
                  </div>
                )}

                {restaurants.map((r, i) => (
                  <RestaurantCard
                    key={i} r={r} index={i} mode={mode}
                    selected={selected === i}
                    onSelect={() => setSelected(selected === i ? null : i)}
                    savedProspect={getSavedProspect(r)}
                    onStatusChange={(status) => patchStatus(r, status)}
                    onActivate={() => openActivate(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && searched && restaurants.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-300 font-bold">Aucun résultat</p>
            <p className="text-slate-500 text-sm mt-1">Essayez une autre ville ou vérifiez votre clé API Perplexity dans Paramètres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
