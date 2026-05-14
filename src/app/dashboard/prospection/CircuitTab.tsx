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

interface SavedProspect {
  id: string; status: Status; restaurantId?: string | null; slug?: string | null; notes?: string | null;
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, emoji, label }: { score: number; emoji: string; label: string }) {
  const color = score >= 78 ? "#f97316" : score >= 58 ? "#22c55e" : score >= 38 ? "#eab308" : "#64748b";
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg leading-none">{emoji}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-bold" style={{ color }}>{label}</span>
          <span className="text-xs text-slate-500">{score}/100</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating }: { rating?: number | null }) {
  if (!rating) return <span className="text-slate-500 text-xs">—</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < full ? "text-yellow-400" : i === full && half ? "text-yellow-400/50" : "text-slate-700"}`} viewBox="0 0 20 20" fill="currentColor">
          <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" />
        </svg>
      ))}
      <span className="text-xs text-slate-400 ml-1 font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Restaurant Card ──────────────────────────────────────────────────────────
function RestaurantCard({
  r, mode, selected, onSelect, expanded, onToggleExpand,
  savedProspect, onStatusChange, onActivate,
}: {
  r: CircuitRestaurant; mode: Mode; selected: boolean;
  onSelect: () => void; expanded: boolean; onToggleExpand: () => void;
  savedProspect?: SavedProspect | null;
  onStatusChange?: (s: Status) => void; onActivate?: () => void;
}) {
  const mapsUrl = r.google_maps_url || (r.lat && r.lng
    ? `https://www.google.com/maps?q=${r.lat},${r.lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent((r.name ?? "") + " " + (r.address ?? ""))}`);

  const score = r.autoScore ?? 0;
  const scoreColor = score >= 78 ? "#f97316" : score >= 58 ? "#22c55e" : score >= 38 ? "#eab308" : "#64748b";

  return (
    <div className={`rounded-xl border transition-all ${selected ? "border-orange-500/60 bg-orange-500/5" : "border-slate-800 bg-slate-900"}`}>
      {/* ── Main row ── */}
      <div className="p-4 cursor-pointer" onClick={onSelect}>
        <div className="flex items-start gap-3">

          {/* Photo */}
          <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
            {r.photo_url ? (
              <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {r.autoScoreEmoji && (
                  <span className="text-xl leading-none flex-shrink-0" title={`${r.autoScoreLabel} — ${score}/100`}>{r.autoScoreEmoji}</span>
                )}
                <p className="font-bold text-white text-sm leading-tight truncate">{r.name}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {savedProspect && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[savedProspect.status]}`}>
                    {STATUS_LABEL[savedProspect.status]}
                  </span>
                )}
                {r.category && (
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700 hidden sm:inline">{r.category}</span>
                )}
              </div>
            </div>

            {/* Score mini bar */}
            {r.autoScore !== undefined && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                  <div className="h-full rounded-full" style={{ width: `${r.autoScore}%`, background: scoreColor }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: scoreColor }}>{r.autoScore}/100</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Stars rating={r.google_rating} />
              {r.reviews_count && <span className="text-[10px] text-slate-500">({r.reviews_count} avis)</span>}
              {r.address && <span className="text-[10px] text-slate-500 truncate max-w-[200px]">📍 {r.address}</span>}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {r.phone && (
                <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors font-semibold">
                  📞 {r.phone}
                </a>
              )}
              {r.website && (
                <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                  target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-colors">
                  🌐 Site
                </a>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-500 transition-colors">
                🗺️ Maps
              </a>
              <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 border rounded-lg transition-colors ${expanded ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                {expanded ? "▲ Moins" : "▼ Plus d'infos"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-4" onClick={(e) => e.stopPropagation()}>

          {/* Photo grande */}
          {r.photo_url && (
            <img src={r.photo_url} alt={r.name}
              className="w-full h-40 object-cover rounded-xl border border-slate-700"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}

          {/* Score breakdown */}
          {r.autoScore !== undefined && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Score de probabilité</p>
              <ScoreBar score={r.autoScore} emoji={r.autoScoreEmoji ?? "🤔"} label={r.autoScoreLabel ?? ""} />
              {r.autoScoreReasons && r.autoScoreReasons.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {r.autoScoreReasons.map((reason, i) => (
                    <li key={i} className="text-xs text-slate-400">{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Infos complètes */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <p className="text-slate-500 uppercase tracking-wide text-[10px] font-semibold">Catégorie</p>
              <p className="text-white">{r.category ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 uppercase tracking-wide text-[10px] font-semibold">Note Google</p>
              <Stars rating={r.google_rating} />
              {r.reviews_count && <p className="text-slate-400 text-[10px]">{r.reviews_count} avis</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-slate-500 uppercase tracking-wide text-[10px] font-semibold">Adresse</p>
              <p className="text-white">{r.address ?? "—"}</p>
            </div>
            {r.website && (
              <div className="space-y-1 col-span-2">
                <p className="text-slate-500 uppercase tracking-wide text-[10px] font-semibold">Site web</p>
                <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                  target="_blank" rel="noopener"
                  className="text-blue-400 hover:underline break-all">{r.website}</a>
              </div>
            )}
            {r.description && (
              <div className="space-y-1 col-span-2">
                <p className="text-slate-500 uppercase tracking-wide text-[10px] font-semibold">Description</p>
                <p className="text-slate-300">{r.description}</p>
              </div>
            )}
          </div>

          {/* Status change si sauvegardé */}
          {savedProspect && (
            <div className="space-y-2 pt-2 border-t border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Statut prospect</p>
              <div className="flex gap-1.5 flex-wrap">
                {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as Status[]).map(s => (
                  <button key={s} onClick={() => onStatusChange?.(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${savedProspect.status === s ? STATUS_CLASSES[s] : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
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
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function CircuitTab() {
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<Mode>("surplace");
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<CircuitRestaurant[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [savedCity, setSavedCity] = useState("");

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextSector, setNextSector] = useState<string | null>(null);
  const [isLargeCity, setIsLargeCity] = useState(false);
  const [currentSector, setCurrentSector] = useState<string | null>(null);
  const [totalSectors, setTotalSectors] = useState(1);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; skipped: number } | null>(null);
  const [savedProspects, setSavedProspects] = useState<Record<string, SavedProspect>>({});

  // Activate
  const [activatingIdx, setActivatingIdx] = useState<number | null>(null);
  const [activateEmail, setActivateEmail] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateResult, setActivateResult] = useState<{ email: string; password: string; loginUrl: string } | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  async function doSearch(isNewSearch: boolean) {
    const searchCity = isNewSearch ? city.trim() : savedCity;
    if (!searchCity) return;

    const currentPage = isNewSearch ? 0 : page;
    const currentExcludes = isNewSearch ? [] : restaurants.map(r => r.name);

    if (isNewSearch) {
      setLoading(true);
      setRestaurants([]);
      setSelected(null);
      setExpanded(null);
      setSaveResult(null);
      setSavedProspects({});
      setPage(0);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch("/api/prospection/circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: searchCity, mode, page: currentPage, excludeNames: currentExcludes }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error === "no_key"
          ? "⚠️ Clé API Perplexity non configurée — rendez-vous dans ⚙️ Paramètres."
          : json.message ?? json.error ?? "Erreur serveur");
        return;
      }

      const newRestaurants: CircuitRestaurant[] = json.restaurants ?? [];

      if (isNewSearch) {
        setRestaurants(newRestaurants);
        setSavedCity(searchCity);
        setSearched(true);
      } else {
        setRestaurants(prev => [...prev, ...newRestaurants]);
      }

      setPage(json.nextPage ?? currentPage + 1);
      setHasMore(json.hasMore ?? false);
      setNextSector(json.nextSector ?? null);
      setIsLargeCity(json.isLargeCity ?? false);
      setCurrentSector(json.sector ?? null);
      setTotalSectors(json.totalSectors ?? 1);
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setSaveResult({ saved: json.saved, skipped: json.skipped });
      loadSavedProspects();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
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
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSavedProspects(prev => ({ ...prev, [r.name.toLowerCase()]: { ...sp, status } }));
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activateEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActivateError(json.error === "email_taken" ? "Email déjà utilisé." : json.error === "already_activated" ? "Déjà activé." : json.error ?? "Erreur");
        return;
      }
      setActivateResult(json.credentials);
      setSavedProspects(prev => ({ ...prev, [r.name.toLowerCase()]: { ...sp, status: "ACTIVATED", restaurantId: json.restaurant.id, slug: json.restaurant.slug } }));
    } catch (e: any) { setActivateError(e.message); }
    setActivateLoading(false);
  }

  function buildItineraryUrl() {
    const geo = restaurants.filter(r => r.lat && r.lng);
    if (geo.length === 0) return null;
    const origin = `${geo[0].lat},${geo[0].lng}`;
    const dest = `${geo[geo.length - 1].lat},${geo[geo.length - 1].lng}`;
    const waypoints = geo.slice(1, -1).slice(0, 8).map(r => `${r.lat},${r.lng}`).join("|");
    const base = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origin}&destination=${dest}`;
    return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base;
  }

  const itineraryUrl = mode === "surplace" ? buildItineraryUrl() : null;
  const withPhone = restaurants.filter(r => r.phone).length;
  const withWebsite = restaurants.filter(r => r.website).length;
  const hotCount = restaurants.filter(r => (r.autoScore ?? 0) >= 78).length;
  const avgScore = restaurants.length > 0
    ? Math.round(restaurants.reduce((s, r) => s + (r.autoScore ?? 0), 0) / restaurants.length)
    : 0;

  const mapProspects = restaurants.filter(r => r.lat && r.lng).map(r => ({
    id: getSavedProspect(r)?.id ?? r.name,
    name: r.name, city: r.city, address: r.address, phone: r.phone,
    website: r.website, category: r.category, description: r.description,
    imageUrl: r.photo_url, sourceUrl: r.google_maps_url,
    status: getSavedProspect(r)?.status ?? "NEW",
    restaurantId: getSavedProspect(r)?.restaurantId ?? null,
    slug: getSavedProspect(r)?.slug ?? null,
    score: r.autoScoreEmoji ?? null,
    lat: r.lat!, lng: r.lng!,
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex-shrink-0 space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">🗺️ Circuits de Prospection</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Scan IA par quadrillage — Perplexity Sonar · Score auto · Zéro doublon</p>
        </div>

        {/* Mode */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
          {([{ id: "surplace", label: "🚶 Sur place" }, { id: "telephone", label: "📞 Téléphone" }] as { id: Mode; label: string }[]).map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === m.id ? "bg-orange-500 text-white shadow" : "text-slate-400 hover:text-white"}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input type="text" value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(true)}
            placeholder="Ville (ex: Lyon, Bordeaux, Paris 11ème…)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 text-sm"
          />
          <button onClick={() => doSearch(true)} disabled={loading || !city.trim()}
            className="px-4 sm:px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center gap-2 flex-shrink-0">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span className="hidden sm:inline">Analyse IA…</span></> : <><span>🔍</span><span className="hidden sm:inline">Rechercher</span></>}
          </button>
        </div>

        {/* Large city info */}
        {isLargeCity && currentSector && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-xs text-purple-300 flex items-center gap-2">
            <span>🏙️</span>
            <span>Grande ville détectée — Scan en cours : <strong>{currentSector}</strong> ({page}/{totalSectors} secteurs)</span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex-shrink-0">{error}</div>
        )}

        {loading && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-1/3" />
                    <div className="h-2 bg-slate-800 rounded w-1/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !searched && !error && (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-white font-bold text-lg mb-2">Scan de ville par quadrillage IA</p>
            <p className="text-slate-400 text-sm max-w-sm">Entrez une ville. Pour les grandes villes (Paris, Lyon, Marseille…), la recherche s'effectue secteur par secteur — cumulez les résultats pour couvrir toute la ville.</p>
          </div>
        )}

        {!loading && searched && restaurants.length > 0 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Stats + actions bar */}
            <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-white">{restaurants.length} restos · <span className="text-orange-400">{savedCity}</span></span>
                <div className="flex gap-2 text-xs text-slate-400 flex-wrap">
                  {hotCount > 0 && <span className="text-orange-400 font-bold">🔥 {hotCount} très chauds</span>}
                  <span>⭐ moy. {avgScore}/100</span>
                  {withPhone > 0 && <span>📞 {withPhone}</span>}
                  {withWebsite > 0 && <span>🌐 {withWebsite} sites</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* View toggle */}
                <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <button onClick={() => setView("list")} className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all ${view === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>☰</button>
                  <button onClick={() => setView("map")} disabled={mapProspects.length === 0} className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all ${view === "map" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>🗺️</button>
                </div>

                {/* Save */}
                {!saveResult ? (
                  <button onClick={saveSearch} disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1">
                    {saving ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />…</> : "💾 Sauvegarder"}
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-bold px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    ✅ {saveResult.saved} new · {saveResult.skipped} déjà connus
                  </span>
                )}

                {itineraryUrl && (
                  <a href={itineraryUrl} target="_blank" rel="noopener"
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-xl transition-colors hidden sm:inline-flex">
                    🗺️ Itinéraire
                  </a>
                )}
                <button onClick={() => navigator.clipboard.writeText(restaurants.map((r, i) => `${i + 1}. ${r.name} | ${r.address} | ${r.phone ?? "—"} | ${r.google_rating ?? "—"}★ | ${r.autoScoreEmoji ?? ""} ${r.autoScore ?? 0}/100`).join("\n"))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 text-xs transition-colors">📋</button>
              </div>
            </div>

            {/* Map */}
            {view === "map" && (
              <div className="flex-1 p-4">
                <LeafletMap prospects={mapProspects} onSelect={(p) => {
                  const idx = restaurants.findIndex(r => r.name === p.name);
                  if (idx >= 0) { setSelected(idx); setView("list"); }
                }} />
              </div>
            )}

            {/* List */}
            {view === "list" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">

                {/* Activate modal */}
                {activatingIdx !== null && !activateResult && (
                  <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
                    <p className="text-orange-400 font-bold text-sm">✨ Créer le compte — {restaurants[activatingIdx]?.name}</p>
                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-48 space-y-1">
                        <label className="text-xs text-slate-400">Email</label>
                        <input value={activateEmail} onChange={(e) => setActivateEmail(e.target.value)} type="email"
                          className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none" />
                      </div>
                      <button onClick={() => setActivateEmail(`${slugify(restaurants[activatingIdx]?.name ?? "")}@matable.pro`)}
                        className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors flex-shrink-0">@matable.pro</button>
                    </div>
                    {activateError && <p className="text-red-400 text-xs">{activateError}</p>}
                    <div className="flex gap-2">
                      <button onClick={activate} disabled={activateLoading || !activateEmail.trim()}
                        className="flex-1 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                        {activateLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />…</> : "✅ Créer"}
                      </button>
                      <button onClick={() => setActivatingIdx(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-sm">Annuler</button>
                    </div>
                  </div>
                )}

                {activateResult && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                    <p className="text-emerald-400 font-bold text-sm">✅ Compte créé !</p>
                    <div className="font-mono text-xs space-y-1 text-slate-300 bg-black/40 rounded-lg p-3">
                      <p>📧 {activateResult.email}</p>
                      <p>🔑 {activateResult.password}</p>
                      <p>🔗 {activateResult.loginUrl}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(`Email: ${activateResult!.email}\nMDP: ${activateResult!.password}\nLien: ${activateResult!.loginUrl}`)}
                        className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300">📋 Copier</button>
                      <a href={activateResult.loginUrl} target="_blank" rel="noopener"
                        className="flex-1 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold text-center">🚀 Dashboard</a>
                      <button onClick={() => { setActivateResult(null); setActivatingIdx(null); }}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400">✕</button>
                    </div>
                  </div>
                )}

                {restaurants.map((r, i) => (
                  <RestaurantCard
                    key={`${r.name}-${i}`} r={r} mode={mode}
                    selected={selected === i}
                    onSelect={() => setSelected(selected === i ? null : i)}
                    expanded={expanded === i}
                    onToggleExpand={() => setExpanded(expanded === i ? null : i)}
                    savedProspect={getSavedProspect(r)}
                    onStatusChange={(s) => patchStatus(r, s)}
                    onActivate={() => { setActivatingIdx(i); setActivateEmail(`${slugify(r.name)}@matable.pro`); setActivateResult(null); setActivateError(null); }}
                  />
                ))}

                {/* ── Continuer la recherche ── */}
                <div className="pt-2 pb-4">
                  {hasMore ? (
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 text-center space-y-3">
                      <p className="text-purple-300 font-bold text-sm">
                        🏙️ Suite disponible — {nextSector ? `prochain secteur : "${nextSector}"` : "continuer la recherche"}
                      </p>
                      <p className="text-slate-400 text-xs">Les {restaurants.length} restaurants déjà trouvés seront exclus automatiquement.</p>
                      <button onClick={() => doSearch(false)} disabled={loadingMore}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto">
                        {loadingMore ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyse…</> : "→ Scanner le secteur suivant"}
                      </button>
                    </div>
                  ) : searched && (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-center space-y-2">
                      <p className="text-slate-400 text-sm">Tous les secteurs de <strong className="text-white">{savedCity}</strong> ont été scannés.</p>
                      <button onClick={() => doSearch(false)} disabled={loadingMore}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl hover:border-slate-500 transition-colors">
                        🔄 Chercher plus (en excluant les {restaurants.length} connus)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && searched && restaurants.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-300 font-bold">Aucun résultat</p>
            <p className="text-slate-500 text-sm mt-1">Vérifiez votre clé API Perplexity dans ⚙️ Paramètres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
