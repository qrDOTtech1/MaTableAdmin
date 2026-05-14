"use client";

import { useState } from "react";
import type { CircuitRestaurant } from "@/app/api/prospection/circuit/route";

type Mode = "surplace" | "telephone";

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
  r,
  index,
  mode,
  selected,
  onSelect,
}: {
  r: CircuitRestaurant;
  index: number;
  mode: Mode;
  selected: boolean;
  onSelect: () => void;
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
        {/* Numéro d'ordre (mode sur place) */}
        {mode === "surplace" && (
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            {index + 1}
          </div>
        )}

        {/* Photo */}
        <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
          {r.photo_url ? (
            <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-white text-sm leading-tight">{r.name}</p>
            {r.category && (
              <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full flex-shrink-0 border border-slate-700">{r.category}</span>
            )}
          </div>

          <StarDisplay rating={r.google_rating} />
          {r.reviews_count && <span className="text-[10px] text-slate-500 ml-1">({r.reviews_count} avis)</span>}

          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
            <span>📍</span> {r.address}
          </p>

          {r.description && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{r.description}</p>
          )}

          {/* Actions rapides */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {r.phone && (
              <a href={`tel:${r.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors font-semibold">
                📞 {r.phone}
              </a>
            )}
            {r.website && (
              <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                target="_blank" rel="noopener"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-colors">
                🌐 Site
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-500 transition-colors">
              🗺️ Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CircuitTab() {
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<Mode>("surplace");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<CircuitRestaurant[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [savedCity, setSavedCity] = useState("");

  async function search() {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    setRestaurants([]);
    setSelected(null);
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

  // Build Google Maps multi-stop itinerary URL (max 10 waypoints in URL)
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

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="p-6 border-b border-slate-800 flex-shrink-0 space-y-5">
        <div>
          <h2 className="text-2xl font-black text-white">🗺️ Circuits de Prospection</h2>
          <p className="text-slate-400 text-sm mt-0.5">Recherche IA des restaurants à prospecter dans une ville — via Perplexity Sonar</p>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
          {([
            { id: "surplace", label: "🚶 Sur place", desc: "Itinéraire optimal à pied / trottinette" },
            { id: "telephone", label: "📞 Téléphone", desc: "Liste optimisée pour appels" },
          ] as { id: Mode; label: string; desc: string }[]).map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === m.id ? "bg-orange-500 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Nom d'une ville (ex: Lyon, Bordeaux, Nice…)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 text-sm"
          />
          <button
            onClick={search}
            disabled={loading || !city.trim()}
            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center gap-2 min-w-[140px] justify-center"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Recherche IA…</>
            ) : (
              <><span>🔍</span> Lancer la recherche</>
            )}
          </button>
        </div>

        {/* Mode description */}
        <div className={`rounded-xl border p-3 text-xs ${mode === "surplace" ? "border-orange-500/30 bg-orange-500/5 text-orange-300" : "border-blue-500/30 bg-blue-500/5 text-blue-300"}`}>
          {mode === "surplace"
            ? "🚶 Mode Sur place : les restaurants sont ordonnés selon un itinéraire optimal (algorithme du plus proche voisin). Un bouton vous ouvrira l'itinéraire complet dans Google Maps."
            : "📞 Mode Téléphone : liste ordonnée avec numéros de téléphone en accès direct. Cliquez sur un numéro pour appeler immédiatement."}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Erreur */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
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

        {/* État vide initial */}
        {!loading && !searched && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-white font-bold text-lg mb-2">Créez votre circuit de prospection</p>
            <p className="text-slate-400 text-sm max-w-sm">
              Entrez une ville et choisissez votre mode. Perplexity va rechercher en temps réel les restaurants indépendants à prospecter avec leurs coordonnées complètes.
            </p>
          </div>
        )}

        {/* Résultats */}
        {!loading && searched && restaurants.length > 0 && (
          <>
            {/* Stats + actions */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-bold text-white">{restaurants.length} restaurants trouvés à <span className="text-orange-400">{savedCity}</span></span>
                <div className="flex gap-3 text-xs text-slate-400">
                  {withPhone > 0 && <span>📞 {withPhone} avec téléphone</span>}
                  {withWebsite > 0 && <span>🌐 {withWebsite} avec site</span>}
                  {avgRating > 0 && <span>⭐ {avgRating.toFixed(1)} moy.</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {itineraryUrl && (
                  <a
                    href={itineraryUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    🗺️ Ouvrir l'itinéraire Google Maps
                  </a>
                )}
                <button
                  onClick={() => {
                    const lines = restaurants.map((r, i) =>
                      `${i + 1}. ${r.name} | ${r.address} | ${r.phone ?? "—"} | ${r.website ?? "—"} | ${r.google_rating ?? "—"}★`
                    ).join("\n");
                    navigator.clipboard.writeText(lines);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 text-sm transition-colors"
                >
                  📋 Copier la liste
                </button>
              </div>
            </div>

            {/* Mode téléphone — statistiques de progression */}
            {mode === "telephone" && (
              <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-center gap-4 text-xs">
                <span className="text-blue-300 font-bold">📞 Mode Téléphone</span>
                <span className="text-slate-400">Cliquez sur un numéro pour appeler directement · Sélectionnez un restaurant pour noter vos observations</span>
              </div>
            )}

            {/* Liste */}
            <div className="space-y-3">
              {restaurants.map((r, i) => (
                <RestaurantCard
                  key={i}
                  r={r}
                  index={i}
                  mode={mode}
                  selected={selected === i}
                  onSelect={() => setSelected(selected === i ? null : i)}
                />
              ))}
            </div>
          </>
        )}

        {/* Aucun résultat */}
        {!loading && searched && restaurants.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-300 font-bold">Aucun résultat</p>
            <p className="text-slate-500 text-sm mt-1">Essayez une autre ville ou vérifiez votre clé API Perplexity dans Paramètres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
