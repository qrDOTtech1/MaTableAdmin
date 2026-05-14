"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
  lat: number;
  lng: number;
  source?: string | null;
}

// Status colors
const STATUS_COLOR: Record<string, string> = {
  NEW: "#3b82f6",
  CONTACTED: "#f59e0b",
  ACTIVATED: "#10b981",
  IGNORED: "#64748b",
};
const STATUS_LABEL: Record<string, string> = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  ACTIVATED: "Activé",
  IGNORED: "Ignoré",
};

function makeIcon(status: string, highlight = false) {
  const color = STATUS_COLOR[status] ?? "#3b82f6";
  const size = highlight ? 18 : 14;
  const border = highlight ? 3 : 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size + border * 2}" height="${size + border * 2}" viewBox="0 0 ${size + border * 2} ${size + border * 2}">
    <circle cx="${(size + border * 2) / 2}" cy="${(size + border * 2) / 2}" r="${size / 2}" fill="${color}" stroke="white" stroke-width="${border}"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size + border * 2, size + border * 2],
    iconAnchor: [(size + border * 2) / 2, (size + border * 2) / 2],
  });
}

// Auto-fit bounds when prospects change
function FitBounds({ prospects }: { prospects: MapProspect[] }) {
  const map = useMap();
  useEffect(() => {
    if (prospects.length === 0) return;
    const bounds = L.latLngBounds(prospects.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [prospects.length]);
  return null;
}

interface LeafletMapProps {
  prospects: MapProspect[];
  selected?: string | null;
  onSelect?: (p: MapProspect) => void;
  highlightIds?: string[];
}

export default function LeafletMap({ prospects, selected, onSelect, highlightIds = [] }: LeafletMapProps) {
  const center: [number, number] = prospects.length > 0
    ? [prospects.reduce((s, p) => s + p.lat, 0) / prospects.length,
       prospects.reduce((s, p) => s + p.lng, 0) / prospects.length]
    : [46.603354, 1.888334]; // France center

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ width: "100%", height: "100%", background: "#0f172a" }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <FitBounds prospects={prospects} />
      {prospects.map(p => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={makeIcon(p.status, p.id === selected || highlightIds.includes(p.id))}
          eventHandlers={{ click: () => onSelect?.(p) }}
        >
          <Popup>
            <div style={{ minWidth: 200, fontFamily: "sans-serif" }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{p.name}</p>
              {p.category && <p style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{p.category}</p>}
              {p.address && <p style={{ fontSize: 11, marginBottom: 4 }}>📍 {p.address}</p>}
              {p.phone && <p style={{ fontSize: 11 }}>📞 {p.phone}</p>}
              <span style={{
                display: "inline-block", marginTop: 6, padding: "2px 8px",
                borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: (STATUS_COLOR[p.status] ?? "#3b82f6") + "33",
                color: STATUS_COLOR[p.status] ?? "#3b82f6",
              }}>{STATUS_LABEL[p.status] ?? p.status}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
