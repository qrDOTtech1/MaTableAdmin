import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export interface CircuitRestaurant {
  name: string;
  address: string;
  city: string;
  phone?: string;
  website?: string;
  google_rating?: number;
  reviews_count?: number;
  category?: string;
  description?: string;
  lat?: number;
  lng?: number;
  photo_url?: string;
  google_maps_url?: string;
}

// Nearest-neighbor TSP on lat/lng to build optimal walking order
function optimizeRoute(restaurants: CircuitRestaurant[]): CircuitRestaurant[] {
  const withGeo = restaurants.filter(r => r.lat && r.lng);
  const withoutGeo = restaurants.filter(r => !r.lat || !r.lng);
  if (withGeo.length <= 1) return restaurants;

  const visited = new Array(withGeo.length).fill(false);
  const result: CircuitRestaurant[] = [];
  let current = 0;
  visited[0] = true;
  result.push(withGeo[0]);

  for (let i = 1; i < withGeo.length; i++) {
    let nearest = -1;
    let minDist = Infinity;
    for (let j = 0; j < withGeo.length; j++) {
      if (visited[j]) continue;
      const dx = (withGeo[j].lat! - withGeo[current].lat!);
      const dy = (withGeo[j].lng! - withGeo[current].lng!);
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; nearest = j; }
    }
    if (nearest === -1) break;
    visited[nearest] = true;
    result.push(withGeo[nearest]);
    current = nearest;
  }

  return [...result, ...withoutGeo];
}

export async function POST(req: Request) {
  try {
    // Get Perplexity key from GlobalConfig
    const rows = await prisma.$queryRaw<Array<{ perplexityApiKey: string | null }>>`
      SELECT "perplexityApiKey" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ perplexityApiKey: null }]);

    const apiKey = rows[0]?.perplexityApiKey;
    if (!apiKey) {
      return NextResponse.json({ error: "no_key", message: "Clé API Perplexity non configurée — allez dans Paramètres." }, { status: 400 });
    }

    const { city, mode } = await req.json();
    if (!city?.trim()) return NextResponse.json({ error: "city_required" }, { status: 400 });

    const prompt = `Trouve exactement 15 restaurants à ${city}, France, qui n'utilisent PAS encore de logiciel de gestion comme MaTable ou similaire (petits restaurants indépendants de préférence).

Pour chaque restaurant, fournis UN objet JSON avec ces champs :
- name (string) : nom du restaurant
- address (string) : adresse complète avec numéro et rue
- city (string) : "${city}"
- phone (string ou null) : numéro de téléphone français
- website (string ou null) : URL du site web
- google_rating (number ou null) : note Google entre 1 et 5
- reviews_count (number ou null) : nombre d'avis Google
- category (string) : type de cuisine (ex: "Français", "Italien", "Japonais"...)
- description (string) : courte description en 1 phrase
- lat (number ou null) : latitude GPS
- lng (number ou null) : longitude GPS
- google_maps_url (string ou null) : URL Google Maps

Réponds UNIQUEMENT avec un tableau JSON valide. Pas de texte avant ni après. Format exact :
[{"name":"...","address":"...","city":"${city}","phone":"...","website":null,"google_rating":4.2,"reviews_count":87,"category":"Français","description":"...","lat":48.8566,"lng":2.3522,"google_maps_url":"https://maps.google.com/?q=..."}]`;

    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant de prospection commerciale pour une startup restaurant. Tu fournis des données JSON précises et réelles sur les restaurants. Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!perplexityRes.ok) {
      const errText = await perplexityRes.text();
      console.error("[circuit] Perplexity error:", errText);
      return NextResponse.json({ error: "perplexity_error", message: errText }, { status: 502 });
    }

    const perplexityData = await perplexityRes.json();
    const content: string = perplexityData.choices?.[0]?.message?.content ?? "[]";

    // Parse JSON — handle markdown code blocks if any
    let restaurants: CircuitRestaurant[] = [];
    try {
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      restaurants = JSON.parse(clean);
    } catch {
      // Try to extract JSON array from text
      const match = content.match(/\[[\s\S]*\]/);
      if (match) restaurants = JSON.parse(match[0]);
    }

    if (!Array.isArray(restaurants)) restaurants = [];

    // Optimize route for on-site mode
    const optimized = mode === "surplace" ? optimizeRoute(restaurants) : restaurants;

    return NextResponse.json({
      restaurants: optimized,
      city,
      mode,
      citations: perplexityData.citations ?? [],
    });
  } catch (err: any) {
    console.error("[circuit]", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}
