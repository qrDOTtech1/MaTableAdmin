"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapProspect {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  category?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  status: string;
  restaurantId?: string | null;
  slug?: string | null;
  notes?: string | null;
  score?: string | null;
  lat: number;
  lng: number;
  source?: string | null;
}

export const STATUS_COLOR: Record<string, string> = {
  NEW: "#3b82f6",
  CONTACTED: "#f59e0b",
  ACTIVATED: "#10b981",
  IGNORED: "#64748b",
};
export const STATUS_LABEL: Record<string, string> = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  ACTIVATED: "Activé",
  IGNORED: "Ignoré",
};
export const SCORE_OPTIONS = [
  { emoji: "🔥", label: "Très chaud" },
  { emoji: "😊", label: "Probable" },
  { emoji: "🤔", label: "Incertain" },
  { emoji: "❄️", label: "Froid" },
];

function makeIcon(status: string, highlight: boolean, score?: string | null) {
  const color = STATUS_COLOR[status] ?? "#3b82f6";
  const size = highlight ? 22 : 16;
  const border = 2;
  const total = size + border * 2;
  const hasScore = score && score !== "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">
    <circle cx="${total / 2}" cy="${total / 2}" r="${size / 2}" fill="${color}" stroke="white" stroke-width="${border}" opacity="${highlight ? 1 : 0.85}"/>
  </svg>`;

  const emojiHtml = hasScore
    ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);font-size:13px;line-height:1;pointer-events:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))">${score}</div>`
    : "";

  return L.divIcon({
    html: `<div style="position:relative;display:inline-block">${svg}${emojiHtml}</div>`,
    className: "",
    iconSize: [total, total],
    iconAnchor: [total / 2, total / 2],
  });
}

// ─── FitBounds : recadre la carte sur les prospects au montage et a chaque changement de liste ───
function FitBounds({ prospects, signal }: { prospects: MapProspect[]; signal: number }) {
  const map = useMap();
  useEffect(() => {
    if (prospects.length === 0) return;
    const bounds = L.latLngBounds(prospects.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [signal]);
  return null;
}

// ─── MoveTracker : detecte les changements de zone pour afficher "Rechercher dans cette zone" ───
function MoveTracker({
  onMove,
  enabled,
}: {
  onMove: (center: [number, number], zoom: number, bounds: L.LatLngBounds) => void;
  enabled: boolean;
}) {
  const map = useMap();
  useMapEvents({
    moveend: () => {
      if (!enabled) return;
      const c = map.getCenter();
      onMove([c.lat, c.lng], map.getZoom(), map.getBounds());
    },
    zoomend: () => {
      if (!enabled) return;
      const c = map.getCenter();
      onMove([c.lat, c.lng], map.getZoom(), map.getBounds());
    },
  });
  return null;
}

interface LeafletMapProps {
  prospects: MapProspect[];
  selected?: string | null;
  onSelect?: (p: MapProspect) => void;
  /** Si fourni, affiche le bouton flottant "Rechercher dans cette zone" */
  onSearchHere?: (center: [number, number], bounds: L.LatLngBounds) => void;
  /** Si true, le bouton "Rechercher dans cette zone" est en cours d'execution (spinner) */
  searching?: boolean;
  /** Filtres rapides */
  filters?: {
    minScore?: number;            // 0..100
    onlyWithoutWebsite?: boolean;
    minGoogleRating?: number;     // 0..5
    statusFilter?: string | null; // NEW / CONTACTED / ACTIVATED / IGNORED
  };
  /** Quand les filtres changent, on declenche un refit */
  filtersSignal?: number;
}

export default function LeafletMap({
  prospects,
  selected,
  onSelect,
  onSearchHere,
  searching = false,
  filters,
  filtersSignal = 0,
}: LeafletMapProps) {
  // Application des filtres cote map (le parent peut aussi pre-filtrer mais on accepte les 2)
  const filtered = prospects.filter(p => {
    if (filters?.statusFilter && p.status !== filters.statusFilter) return false;
    // les autres filtres sont appliques au niveau parent (CircuitTab) car ils ont besoin de
    // donnees brutes (autoScore, google_rating) qui ne sont pas dans MapProspect
    return true;
  });

  const initialCenter: [number, number] = filtered.length > 0
    ? [
        filtered.reduce((s, p) => s + p.lat, 0) / filtered.length,
        filtered.reduce((s, p) => s + p.lng, 0) / filtered.length,
      ]
    : [46.603354, 1.888334];

  const [showSearchHere, setShowSearchHere] = useState(false);
  const lastMoveRef = useRef<{ center: [number, number]; bounds: L.LatLngBounds } | null>(null);
  const initialFitDoneRef = useRef(false);

  // On n'affiche "Rechercher dans cette zone" qu'apres le 1er fit auto, sinon le bouton apparait
  // immediatement au mount (faux positif).
  useEffect(() => {
    const t = setTimeout(() => { initialFitDoneRef.current = true; }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={initialCenter}
        zoom={6}
        style={{ width: "100%", height: "100%", background: "#0f172a" }}
        className="rounded-xl"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <FitBounds prospects={filtered} signal={filtersSignal + filtered.length} />

        {onSearchHere && (
          <MoveTracker
            enabled={!!onSearchHere}
            onMove={(center, zoom, bounds) => {
              lastMoveRef.current = { center, bounds };
              if (initialFitDoneRef.current && zoom >= 11) setShowSearchHere(true);
            }}
          />
        )}

        {filtered.map(p => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={makeIcon(p.status, p.id === selected, p.score)}
            eventHandlers={{ click: () => onSelect?.(p) }}
          >
            <Popup maxWidth={280} minWidth={220}>
              <div style={{ fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
                {p.imageUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {p.score && <span style={{ fontSize: 16 }}>{p.score}</span>}
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, flex: 1 }}>{p.name}</p>
                </div>

                {p.category && (
                  <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 6px 0", fontWeight: 500 }}>
                    {p.category}
                  </p>
                )}

                {p.address && (
                  <p style={{ fontSize: 11, margin: "0 0 4px 0", color: "#334155" }}>
                    📍 {p.address}
                  </p>
                )}

                {p.phone && (
                  <p style={{ fontSize: 11, margin: "0 0 8px 0" }}>
                    📞 <a href={`tel:${p.phone}`} style={{ color: "#f97316", textDecoration: "none", fontWeight: 600 }}>{p.phone}</a>
                  </p>
                )}

                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-block", padding: "3px 8px",
                    borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: (STATUS_COLOR[p.status] ?? "#3b82f6") + "33",
                    color: STATUS_COLOR[p.status] ?? "#3b82f6",
                  }}>{STATUS_LABEL[p.status] ?? p.status}</span>

                  {p.phone && (
                    <a
                      href={`tel:${p.phone}`}
                      style={{
                        padding: "3px 8px", borderRadius: 99,
                        fontSize: 10, fontWeight: 700,
                        background: "#10b98133", color: "#10b981",
                        textDecoration: "none",
                      }}
                    >📞 Appeler</a>
                  )}

                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        padding: "3px 8px", borderRadius: 99,
                        fontSize: 10, fontWeight: 700,
                        background: "#3b82f633", color: "#3b82f6",
                        textDecoration: "none",
                      }}
                    >🌐 Site</a>
                  )}

                  {p.sourceUrl && (
                    <a
                      href={p.sourceUrl}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        padding: "3px 8px", borderRadius: 99,
                        fontSize: 10, fontWeight: 700,
                        background: "#64748b33", color: "#64748b",
                        textDecoration: "none",
                      }}
                    >🔗 Google Maps</a>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Bouton flottant "Rechercher dans cette zone" */}
      {onSearchHere && showSearchHere && (
        <button
          type="button"
          disabled={searching}
          onClick={() => {
            if (!lastMoveRef.current) return;
            onSearchHere(lastMoveRef.current.center, lastMoveRef.current.bounds);
            setShowSearchHere(false);
          }}
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 999,
            background: "#f97316",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: searching ? "wait" : "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
            opacity: searching ? 0.7 : 1,
          }}
        >
          {searching ? (
            <>
              <span style={{
                width: 14, height: 14,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Recherche...
            </>
          ) : (
            <>
              🔄 Rechercher dans cette zone
            </>
          )}
        </button>
      )}
    </div>
  );
}
