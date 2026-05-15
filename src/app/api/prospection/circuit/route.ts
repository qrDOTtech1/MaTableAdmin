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
  // Auto-computed
  autoScore?: number;
  autoScoreEmoji?: string;
  autoScoreLabel?: string;
  autoScoreReasons?: string[];
}

// ─── Auto-score (0–100) ───────────────────────────────────────────────────────
function computeScore(r: CircuitRestaurant): {
  score: number; emoji: string; label: string; reasons: string[];
} {
  let score = 45;
  const reasons: string[] = [];

  // Pas de site web = fort besoin de digitalisation
  if (!r.website) {
    score += 25;
    reasons.push("✅ Pas de site web — besoin digital");
  } else {
    score -= 5;
    reasons.push("ℹ️ Site web existant");
  }

  // Téléphone dispo = contactable
  if (r.phone) {
    score += 10;
    reasons.push("✅ Numéro de téléphone disponible");
  } else {
    score -= 10;
    reasons.push("⚠️ Pas de numéro — difficile à contacter");
  }

  // Note Google : zone idéale 3.8–4.4
  if (r.google_rating) {
    if (r.google_rating >= 3.8 && r.google_rating <= 4.4) {
      score += 15;
      reasons.push(`✅ Note ${r.google_rating}★ — profil idéal`);
    } else if (r.google_rating > 4.4) {
      score += 5;
      reasons.push(`ℹ️ Note ${r.google_rating}★ — excellent mais saturé`);
    } else if (r.google_rating >= 3.0 && r.google_rating < 3.8) {
      score += 8;
      reasons.push(`⚠️ Note ${r.google_rating}★ — peut s'améliorer`);
    } else {
      score -= 15;
      reasons.push(`❌ Note ${r.google_rating}★ — trop basse`);
    }
  } else {
    reasons.push("ℹ️ Note Google inconnue");
  }

  // Volume d'avis : 30–300 = idéal
  if (r.reviews_count) {
    if (r.reviews_count >= 30 && r.reviews_count <= 300) {
      score += 10;
      reasons.push(`✅ ${r.reviews_count} avis — volume idéal`);
    } else if (r.reviews_count > 300) {
      score -= 5;
      reasons.push(`ℹ️ ${r.reviews_count} avis — très connu`);
    } else {
      score -= 5;
      reasons.push(`⚠️ Seulement ${r.reviews_count} avis`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  let emoji: string;
  let label: string;
  if (score >= 78) { emoji = "🔥"; label = "Très chaud"; }
  else if (score >= 58) { emoji = "😊"; label = "Probable"; }
  else if (score >= 38) { emoji = "🤔"; label = "Incertain"; }
  else { emoji = "❄️"; label = "Froid"; }

  return { score, emoji, label, reasons };
}

// ─── Quadrillage grandes villes ───────────────────────────────────────────────
const CITY_SECTORS: Record<string, string[]> = {
  paris: [
    "1er, 2ème, 3ème, 4ème arrondissements (Marais, Châtelet, île Saint-Louis)",
    "5ème, 6ème arrondissements (Quartier Latin, Saint-Germain-des-Prés)",
    "7ème, 8ème arrondissements (Invalides, Champs-Élysées)",
    "9ème, 10ème arrondissements (Opéra, République, Canal Saint-Martin)",
    "11ème, 12ème arrondissements (Bastille, Nation, Oberkampf)",
    "13ème, 14ème arrondissements (Butte-aux-Cailles, Montparnasse)",
    "15ème, 16ème arrondissements (Convention, Passy, Auteuil)",
    "17ème, 18ème arrondissements (Batignolles, Montmartre, Pigalle)",
    "19ème, 20ème arrondissements (Belleville, Buttes-Chaumont, Ménilmontant)",
  ],
  lyon: [
    "Presqu'île et 1er arrondissement (Terreaux, Hôtel de Ville)",
    "2ème arrondissement (Perrache, Confluence, Ainay)",
    "3ème arrondissement (Part-Dieu, Guillotière Est, Montchat)",
    "4ème arrondissement (La Croix-Rousse)",
    "5ème arrondissement (Vieux-Lyon, Saint-Jean, Saint-Paul)",
    "6ème arrondissement (Brotteaux, Cité Internationale)",
    "7ème arrondissement (Guillotière, Jean Macé, Gerland Nord)",
    "8ème arrondissement (Monplaisir, États-Unis, Gerland Sud)",
  ],
  marseille: [
    "1er et 2ème arrondissements (Vieux-Port, Le Panier, La Joliette)",
    "4ème, 5ème arrondissements (Cinq-Avenues, Baille, Notre-Dame-du-Mont)",
    "6ème arrondissement (Castellane, Cours Julien, Préfecture)",
    "7ème et 8ème arrondissements (Saint-Victor, Prado, Vieille-Chapelle)",
    "9ème et 10ème arrondissements (La Pointe-Rouge, Les Goudes, Les Baumettes)",
    "13ème et 14ème arrondissements (Les Chartreux, Les Arnavaux)",
  ],
  bordeaux: [
    "Centre historique et Saint-Pierre (Triangle d'or, Chartrons)",
    "Saint-Michel et Capucins (Victoire, Sainte-Croix)",
    "Bastide et rive droite (Darwin, Bègles)",
    "Mériadeck, Saint-Augustin, Caudéran",
    "Bacalan, Bassins à flot, Grand-Parc",
  ],
  toulouse: [
    "Capitole, Centre et Carmes",
    "Saint-Cyprien, Saint-Étienne, Busca",
    "Les Minimes, La Roseraie, Compans-Caffarelli",
    "Rangueil, Empalot, Croix-Daurade",
  ],
  nice: [
    "Vieux-Nice, Port et Riquier",
    "Centre-ville, Gare et Liberation",
    "Cimiez, Musiciens, Madeleine",
    "Magnan, Fabron, Les Baumettes",
  ],
  nantes: [
    "Centre-ville, Bouffay, Graslin",
    "Île de Nantes, Chantenay",
    "Zola, Canclaux, Procé",
    "Breil, Bellevue, Dervallières",
  ],
  strasbourg: [
    "Grande Île, Petite France, Krutenau",
    "Neudorf, Meinau, Neuhof",
    "Robertsau, Orangerie, Wacken",
    "Hautepierre, Koenigshoffen, Cronenbourg",
  ],
  montpellier: [
    "Écusson, Centre historique, Comédie",
    "Antigone, Port Marianne, Richter",
    "Figuerolles, Mosson, Cévennes",
    "Millénaire, Odysseum, Ovalie",
  ],
  rennes: [
    "Centre-ville, Thabor, Sainte-Anne",
    "Villejean, Cleunay, Francisco Ferrer",
    "Bréquigny, Beauregard, Maurepas",
    "Beaulieu, Longchamps, Arsenal",
  ],
  // ── US ──
  "new york": [
    "Manhattan Midtown (Times Square, Hell's Kitchen, Murray Hill)",
    "Manhattan Downtown (Financial District, Tribeca, SoHo, Lower East Side)",
    "Manhattan Uptown (Upper East Side, Upper West Side, Harlem)",
    "Brooklyn (Williamsburg, DUMBO, Park Slope, Bushwick)",
    "Queens (Astoria, Jackson Heights, Flushing, Long Island City)",
    "The Bronx & Staten Island",
  ],
  "los angeles": [
    "Downtown LA, Arts District, Little Tokyo",
    "Hollywood, Los Feliz, Silver Lake, Echo Park",
    "West Hollywood, Beverly Hills, Brentwood",
    "Santa Monica, Venice, Culver City",
    "Koreatown, Mid-City, Fairfax",
    "Pasadena, Alhambra, Monterey Park",
  ],
  chicago: [
    "The Loop, River North, Streeterville",
    "Lincoln Park, Lakeview, Wrigleyville",
    "Wicker Park, Bucktown, Logan Square",
    "Pilsen, Bridgeport, Chinatown",
    "Hyde Park, South Loop, Bronzeville",
  ],
  miami: [
    "South Beach, Collins Ave, Ocean Drive",
    "Wynwood, Midtown, Design District",
    "Brickell, Downtown, Coconut Grove",
    "Little Havana, Little Haiti, Edgewater",
  ],
  "san francisco": [
    "Financial District, Union Square, SoMa",
    "Mission District, Castro, Noe Valley",
    "North Beach, Chinatown, Fisherman's Wharf",
    "Richmond, Sunset, Inner Sunset",
    "Hayes Valley, Haight-Ashbury, Cole Valley",
  ],
  // ── UK ──
  london: [
    "Central London (Soho, Covent Garden, Fitzrovia, Marylebone)",
    "East London (Shoreditch, Bethnal Green, Hackney, Dalston)",
    "South London (Borough, Bermondsey, Brixton, Clapham)",
    "West London (Notting Hill, Chelsea, Fulham, Hammersmith)",
    "North London (Islington, Camden, Kentish Town, Crouch End)",
  ],
  // ── Canada ──
  toronto: [
    "Downtown Core, Financial District, Entertainment District",
    "Kensington Market, Chinatown, Little Italy",
    "Leslieville, Distillery District, Riverside",
    "Yorkville, Annex, Bloor West Village",
  ],
  montreal: [
    "Plateau-Mont-Royal, Mile End, Outremont",
    "Vieux-Montréal, Centre-Ville, Quartier des Spectacles",
    "Rosemont, Villeray, Petite-Patrie",
    "NDG, Côte-des-Neiges, Côte-Saint-Luc",
  ],
  // ── Australia ──
  sydney: [
    "CBD, The Rocks, Circular Quay, Darling Harbour",
    "Surry Hills, Newtown, Glebe, Erskineville",
    "Bondi, Coogee, Randwick, Paddington",
    "Balmain, Rozelle, Leichhardt, Annandale",
  ],
};

function getCitySectors(city: string): string[] | null {
  const norm = city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [key, sectors] of Object.entries(CITY_SECTORS)) {
    if (norm.includes(key)) return sectors;
  }
  return null;
}

// ─── Nearest-neighbor TSP ─────────────────────────────────────────────────────
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
    let nearest = -1, minDist = Infinity;
    for (let j = 0; j < withGeo.length; j++) {
      if (visited[j]) continue;
      const dx = withGeo[j].lat! - withGeo[current].lat!;
      const dy = withGeo[j].lng! - withGeo[current].lng!;
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

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // Get Perplexity key
    const rows = await prisma.$queryRaw<Array<{ perplexityApiKey: string | null }>>`
      SELECT "perplexityApiKey" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ perplexityApiKey: null }]);

    const apiKey = rows[0]?.perplexityApiKey;
    if (!apiKey) {
      return NextResponse.json({ error: "no_key", message: "Clé API Perplexity non configurée." }, { status: 400 });
    }

    const { city, mode, page = 0, excludeNames = [] } = await req.json();
    if (!city?.trim()) return NextResponse.json({ error: "city_required" }, { status: 400 });

    // Detect large city + current sector
    const sectors = getCitySectors(city);
    const currentSector = sectors ? sectors[page % sectors.length] : null;
    const isLargeCity = !!sectors;
    const hasMoreSectors = sectors ? page + 1 < sectors.length : false;

    // Detect if city is likely French (for phone format hints)
    const frenchCityHints = ["paris","lyon","marseille","toulouse","nice","nantes","strasbourg","montpellier","bordeaux","rennes","reims","le havre","saint-etienne","toulon","grenoble","dijon","angers","nîmes","villeurbanne","le mans","aix-en-provence","clermont","brest","limoges","amiens","perpignan","metz","besançon","orléans","rouen","mulhouse","caen","nancy","argenteuil","montreuil","roubaix","tourcoing","dunkerque","avignon","poitiers","pau","calais","mérignac","versailles","saint-denis","saint-paul","aubervilliers","aulnay","champigny"];
    const cityLower = city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const isFrench = frenchCityHints.some(h => cityLower.includes(h))
      || /\b(0[1-9])(\s?\d{2}){4}\b/.test(city);

    // Load already-saved prospects for this city from DB (avoid duplicates)
    const dbNames: string[] = [];
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "lat" FLOAT`).catch(() => {});
      const existing = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM "Prospect"
        WHERE LOWER(city) = LOWER(${city.trim()})
        LIMIT 200
      `;
      dbNames.push(...existing.map((r: any) => r.name));
    } catch {}

    const allExcluded = [...new Set([...excludeNames, ...dbNames])];

    // Build zone description
    const zone = currentSector
      ? `in the "${currentSector}" district of ${city}`
      : `in ${city}`;

    const phoneFormatHint = isFrench
      ? `format français "0X XX XX XX XX"`
      : `format international local (ex: "+1 415 000 0000" pour USA, "+44 20 0000 0000" pour UK, etc.)`;

    const excludeBlock = allExcluded.length > 0
      ? `\n\nDO NOT include these restaurants already in our database:\n${allExcluded.slice(0, 60).map(n => `- ${n}`).join("\n")}`
      : "";

    const prompt = `You are a commercial prospecting expert for the restaurant industry. Search in real time on Google Maps, Yelp, TripAdvisor, and local directories to find exactly 15 independent restaurants ${zone}.

ABSOLUTE RULES:
1. INDEPENDENT restaurants only — no chains (McDonald's, KFC, Pizza Hut, Starbucks, Subway, etc.)
2. Restaurants ACTUALLY OPEN right now
3. For EACH restaurant you MUST find and provide the phone number — check Google Maps, Yelp, TripAdvisor, the restaurant's website. Phone is CRITICAL.
4. Prioritize restaurants without a professional website (better sales potential for our software)${excludeBlock}

REQUIRED FIELDS for each restaurant — strict JSON:
- "name": exact name as shown on Google Maps
- "address": full address with street number and postal/zip code
- "city": "${city}"
- "phone": REAL phone number found on Google Maps or local directories, ${phoneFormatHint} — search actively, set null ONLY if truly not found after searching
- "website": full URL of website if exists (null otherwise)
- "google_rating": Google rating between 1.0 and 5.0 (number, not string)
- "reviews_count": number of Google reviews (integer)
- "category": precise cuisine type (e.g. "French bistro", "Neapolitan pizza", "Traditional Japanese", "Alsatian brasserie", "Mexican tacos", "American burger", etc.)
- "description": 1 sentence describing the ambiance and specialty
- "lat": exact GPS latitude (number, e.g. 48.8521)
- "lng": exact GPS longitude (number, e.g. 2.3478)
- "google_maps_url": direct Google Maps link to the restaurant

IMPORTANT: Reply ONLY with the JSON array. Zero text before or after. Zero markdown. Zero backticks.
Format example: [{"name":"The Zinc","address":"12 Main St, 90210 Los Angeles","city":"${city}","phone":"+1 310 000 0000","website":null,"google_rating":4.2,"reviews_count":187,"category":"French bistro","description":"Cozy French bistro with homemade specials.","lat":34.0522,"lng":-118.2437,"google_maps_url":"https://maps.google.com/?cid=..."}]`;

    const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a commercial prospecting expert for the restaurant industry worldwide. You perform real-time web searches (Google Maps, Yelp, TripAdvisor, local directories) to find accurate, up-to-date data on independent restaurants anywhere in the world. You reply ONLY with valid JSON arrays, no text around it.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!pRes.ok) {
      const errText = await pRes.text();
      return NextResponse.json({ error: "perplexity_error", message: errText }, { status: 502 });
    }

    const pData = await pRes.json();
    const content: string = pData.choices?.[0]?.message?.content ?? "[]";
    console.log("[circuit] raw content length:", content.length, "| first 300:", content.slice(0, 300));

    let restaurants: CircuitRestaurant[] = [];

    // Ultra-robust JSON extraction
    const parseAttempts = [
      // 1. Direct after stripping markdown fences
      () => JSON.parse(content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()),
      // 2. First [...] block (greedy)
      () => { const m = content.match(/\[[\s\S]*\]/); if (!m) throw new Error("no array"); return JSON.parse(m[0]); },
      // 3. Last [...] block (sometimes there's text before)
      () => { const all = [...content.matchAll(/\[[\s\S]*?\]/g)]; if (!all.length) throw new Error("no array"); return JSON.parse(all[all.length - 1][0]); },
      // 4. Find first [ and last ] and extract
      () => { const s = content.indexOf("["); const e = content.lastIndexOf("]"); if (s === -1 || e === -1) throw new Error("no brackets"); return JSON.parse(content.slice(s, e + 1)); },
    ];

    for (const attempt of parseAttempts) {
      try {
        const parsed = attempt();
        if (Array.isArray(parsed) && parsed.length > 0) { restaurants = parsed; break; }
      } catch {}
    }

    if (!Array.isArray(restaurants)) restaurants = [];
    console.log("[circuit] parsed restaurants:", restaurants.length);

    // Normalize phone numbers — support French + international formats
    restaurants = restaurants.map(r => {
      if (!r.phone) return r;
      const raw = String(r.phone).trim();
      // If it starts with + it's already international format — keep as-is (light clean)
      if (raw.startsWith("+")) {
        const cleaned = raw.replace(/[.\-()]/g, "").replace(/\s+/g, " ").trim();
        return { ...r, phone: cleaned };
      }
      let p = raw.replace(/\s+/g, "").replace(/[.\-()]/g, "");
      // French: 0033 or 33 prefix → convert to 0X
      if (p.startsWith("0033")) p = "0" + p.slice(4);
      else if (p.startsWith("33") && p.length === 11) p = "0" + p.slice(2);
      const digits = p.replace(/\D/g, "");
      // French 10-digit format
      if (digits.length === 10 && digits.startsWith("0")) {
        const fmt = digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
        return { ...r, phone: fmt };
      }
      // International fallback: keep raw if it has at least 7 digits
      if (digits.length >= 7) return { ...r, phone: raw };
      return { ...r, phone: undefined };
    });

    // Filter out already-excluded names (case-insensitive)
    const excludedLower = new Set(allExcluded.map(n => n.toLowerCase().trim()));
    restaurants = restaurants.filter(r => !excludedLower.has(r.name?.toLowerCase()?.trim() ?? ""));

    // Compute auto-score for each
    restaurants = restaurants.map(r => {
      const s = computeScore(r);
      return { ...r, autoScore: s.score, autoScoreEmoji: s.emoji, autoScoreLabel: s.label, autoScoreReasons: s.reasons };
    });

    // Optimize route if surplace
    if (mode === "surplace") {
      restaurants = optimizeRoute(restaurants);
    } else {
      // Phone mode: sort by score desc
      restaurants = [...restaurants].sort((a, b) => (b.autoScore ?? 0) - (a.autoScore ?? 0));
    }

    return NextResponse.json({
      restaurants,
      city,
      mode,
      page,
      sector: currentSector,
      isLargeCity,
      hasMore: hasMoreSectors || (isLargeCity && page + 1 < (sectors?.length ?? 1)),
      nextPage: page + 1,
      nextSector: sectors ? sectors[(page + 1) % sectors.length] : null,
      totalSectors: sectors?.length ?? 1,
      citations: pData.citations ?? [],
    });
  } catch (err: any) {
    console.error("[circuit]", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}
