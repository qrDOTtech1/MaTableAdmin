import { NextResponse } from "next/server";

/**
 * Reverse-geocode un centre GPS vers un nom de ville / quartier exploitable
 * par /api/prospection/circuit. Utilise Nominatim (free, sans clé).
 *
 * GET /api/prospection/reverse-geocode?lat=48.8566&lng=2.3522
 *   → { city: "Paris", display_name: "...", country: "France" }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
  }

  try {
    const nominatim = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await fetch(nominatim, {
      headers: { "User-Agent": "MaTable-Prospection/1.0 (contact@matable.fr)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "nominatim_error", status: res.status }, { status: 502 });
    }

    const data = await res.json();
    const addr = data.address ?? {};

    // On essaie plusieurs cles dans l'ordre du plus precis au plus large
    const city: string =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.municipality ??
      addr.suburb ??
      addr.county ??
      addr.state ??
      "";

    const district = addr.suburb ?? addr.neighbourhood ?? addr.city_district ?? null;
    const country = addr.country ?? null;

    // Format Perplexity-friendly : "Quartier, Ville" si on a un district significatif
    const searchQuery = district && district !== city
      ? `${district}, ${city}`
      : city || data.display_name;

    return NextResponse.json({
      city,
      district,
      country,
      searchQuery,
      display_name: data.display_name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "fetch_failed", message: err?.message ?? "unknown" }, { status: 500 });
  }
}
