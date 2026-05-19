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

// Normalise une chaîne : minuscules + suppression des accents (NFD + drop combining marks U+0300..U+036F)
// IMPORTANT : on utilise le code Unicode explicite \u0300-\u036F au lieu d'une plage litterale
// (qui ne marche pas selon l'encodage du fichier source).
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // combining diacriticals (accents)
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Découpe en "mots" (alphanumériques) pour éviter les faux matches sur substrings
function tokenize(s: string): string[] {
  return norm(s).split(/[^a-z0-9]+/).filter(Boolean);
}

// Match strict : la clé de CITY_SECTORS doit etre composee de mots ENTIERS presents
// dans le nom de ville. Empeche "paris" de matcher "Cormeilles-en-Parisis".
// Bonus : exige aussi qu'il n'y ait pas de tokens "decalants" comme "saint", "sur",
// "en" entre les mots de la cle (sinon "Saint-Paul" matche "paul" qui n'est pas une cle).
function getCitySectors(city: string): string[] | null {
  const tokens = tokenize(city);
  if (tokens.length === 0) return null;

  for (const [key, sectors] of Object.entries(CITY_SECTORS)) {
    const keyTokens = tokenize(key);
    if (keyTokens.length === 0) continue;

    // Tous les tokens de la cle doivent etre exactement presents et CONSECUTIFS
    // pour eviter les faux matches type "paris" dans "Cormeilles-en-Parisis".
    let matched = false;
    for (let i = 0; i <= tokens.length - keyTokens.length; i++) {
      let ok = true;
      for (let j = 0; j < keyTokens.length; j++) {
        if (tokens[i + j] !== keyTokens[j]) { ok = false; break; }
      }
      if (ok) { matched = true; break; }
    }
    if (matched) return sectors;
  }
  return null;
}

// ─── Nominatim geocoding (OpenStreetMap, free, no key) ───────────────────────
async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, ${city}`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=0`,
      { headers: { "User-Agent": "MaTable-Prospection/1.0 (contact@matable.fr)" }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { return null; }
}

async function geocodeAll(restaurants: CircuitRestaurant[]): Promise<CircuitRestaurant[]> {
  // Batch of 3 parallel requests, 1.1s between batches → 15 restaurants ≈ 6s extra
  const BATCH = 3;
  const result = [...restaurants];
  for (let i = 0; i < restaurants.length; i += BATCH) {
    const batch = restaurants.slice(i, i + BATCH);
    const geos = await Promise.all(
      batch.map(r => geocodeAddress(r.address ?? r.name, r.city ?? ""))
    );
    geos.forEach((geo, j) => {
      if (geo) result[i + j] = { ...result[i + j], lat: geo.lat, lng: geo.lng };
    });
    if (i + BATCH < restaurants.length) {
      await new Promise(res => setTimeout(res, 1100)); // respect Nominatim 1 req/s
    }
  }
  return result;
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

    // Détection "ville française" élargie :
    //  - liste de ~80 chefs-lieux + grandes communes (tokens entiers, pas substring)
    //  - regex code postal FR 5 chiffres ou département présent dans le champ
    //  - regex téléphone FR
    const frenchCityHints = [
      "paris","lyon","marseille","toulouse","nice","nantes","strasbourg","montpellier","bordeaux",
      "rennes","reims","le havre","saint etienne","saint-etienne","toulon","grenoble","dijon",
      "angers","nimes","villeurbanne","le mans","aix en provence","aix-en-provence","clermont",
      "clermont ferrand","clermont-ferrand","brest","limoges","amiens","perpignan","metz",
      "besancon","orleans","rouen","mulhouse","caen","nancy","argenteuil","montreuil","roubaix",
      "tourcoing","dunkerque","avignon","poitiers","pau","calais","merignac","versailles",
      "saint denis","saint-denis","saint paul","saint-paul","aubervilliers","aulnay","champigny",
      "evreux","la rochelle","cherbourg","quimper","lorient","valence","colmar","beauvais",
      "annecy","chambery","angouleme","saint nazaire","saint-nazaire","creteil","nanterre",
      "boulogne","courbevoie","colombes","asnieres","rueil","levallois","issy","vincennes",
      "neuilly","antibes","cannes","ajaccio","bastia","tarbes","bayonne","biarritz","arras",
      "lille","tours","villepinte","sarcelles","tremblay","drancy","noisy","sevran"
    ];
    const cityTokens = tokenize(city);
    const isFrench =
      frenchCityHints.some(h => {
        const ht = tokenize(h);
        return ht.every(t => cityTokens.includes(t));
      }) ||
      /\b\d{5}\b/.test(city) ||                          // code postal FR 5 chiffres
      /\b(fr|france)\b/i.test(city) ||
      /\b(0[1-9])(\s?\d{2}){4}\b/.test(city);            // téléphone FR

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

    // Demande FLEXIBLE : "jusqu'a 15", "au moins 5" → Perplexity n'echoue plus sur les
    // petites villes ou il n'y a pas 15 restaurants. Cle anti-zero-results.
    const targetCount = currentSector ? 15 : 12;
    const minCount = currentSector ? 8 : 5;

    const prompt = `You are a commercial prospecting expert for the restaurant industry. Search in real time on Google Maps, Yelp, TripAdvisor, and local directories to find independent restaurants ${zone}.

ABSOLUTE RULES:
1. INDEPENDENT restaurants only — no chains (McDonald's, KFC, Pizza Hut, Starbucks, Subway, etc.)
2. Restaurants ACTUALLY OPEN right now
3. For EACH restaurant you MUST find and provide the phone number — check Google Maps, Yelp, TripAdvisor, the restaurant's website. Phone is CRITICAL.
4. Prioritize restaurants without a professional website (better sales potential for our software)${excludeBlock}

QUANTITY: aim for ${targetCount} restaurants; if the city/area is small, return at LEAST ${minCount} — but NEVER return an empty array. If you cannot find ${minCount}, return what you find (even 3 or 4). DO NOT invent fake restaurants.

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

    // ─── Appel Perplexity avec retry + fallback de modele ─────────────────────
    // Strategie :
    //   1. Tentative 1 : sonar-pro (recherche plus profonde, meilleur recall sur petites villes)
    //   2. Si <minCount resultats OU erreur reseau OU JSON vide : retry sur sonar-pro avec temp legerement plus haute
    //   3. Si toujours pauvre : fallback sur sonar standard
    async function callPerplexity(model: string, temperature: number, timeoutMs: number): Promise<{ content: string; citations: any[] } | null> {
      const ctl = AbortSignal.timeout(timeoutMs);
      try {
        const res = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: "You are a commercial prospecting expert for the restaurant industry worldwide. You perform real-time web searches (Google Maps, Yelp, TripAdvisor, local directories) to find accurate, up-to-date data on independent restaurants anywhere in the world. You reply ONLY with valid JSON arrays, no text around it. If the area is small, return fewer restaurants — never an empty array.",
              },
              { role: "user", content: prompt },
            ],
            temperature,
            max_tokens: 8000,
          }),
          signal: ctl,
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[circuit] ${model} HTTP ${res.status}:`, errText.slice(0, 300));
          return null;
        }
        const data = await res.json();
        const content: string = data.choices?.[0]?.message?.content ?? "[]";
        return { content, citations: data.citations ?? [] };
      } catch (err: any) {
        console.error(`[circuit] ${model} error:`, err?.message ?? err);
        return null;
      }
    }

    // Parser robuste reutilisable
    function tryParse(content: string): CircuitRestaurant[] {
      const attempts = [
        () => JSON.parse(content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()),
        () => { const m = content.match(/\[[\s\S]*\]/); if (!m) throw new Error("no array"); return JSON.parse(m[0]); },
        () => { const all = [...content.matchAll(/\[[\s\S]*?\]/g)]; if (!all.length) throw new Error("no array"); return JSON.parse(all[all.length - 1][0]); },
        () => { const s = content.indexOf("["); const e = content.lastIndexOf("]"); if (s === -1 || e === -1) throw new Error("no brackets"); return JSON.parse(content.slice(s, e + 1)); },
      ];
      for (const attempt of attempts) {
        try {
          const parsed = attempt();
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      return [];
    }

    // Tentative 1 : sonar-pro
    let attemptLogs: string[] = [];
    let citations: any[] = [];
    let restaurants: CircuitRestaurant[] = [];

    const r1 = await callPerplexity("sonar-pro", 0.15, 60000);
    if (r1) {
      restaurants = tryParse(r1.content);
      citations = r1.citations;
      attemptLogs.push(`sonar-pro(0.15) → ${restaurants.length}`);
      console.log("[circuit] sonar-pro raw len:", r1.content.length, "parsed:", restaurants.length);
    } else {
      attemptLogs.push("sonar-pro(0.15) → network_error");
    }

    // Tentative 2 : retry sonar-pro avec temp plus haute si trop peu de resultats
    if (restaurants.length < minCount) {
      const r2 = await callPerplexity("sonar-pro", 0.35, 60000);
      if (r2) {
        const arr = tryParse(r2.content);
        if (arr.length > restaurants.length) {
          restaurants = arr;
          citations = r2.citations;
        }
        attemptLogs.push(`sonar-pro(0.35) → ${arr.length}`);
      } else {
        attemptLogs.push("sonar-pro(0.35) → network_error");
      }
    }

    // Tentative 3 : fallback sonar standard
    if (restaurants.length < Math.max(3, Math.floor(minCount / 2))) {
      const r3 = await callPerplexity("sonar", 0.2, 45000);
      if (r3) {
        const arr = tryParse(r3.content);
        if (arr.length > restaurants.length) {
          restaurants = arr;
          citations = r3.citations;
        }
        attemptLogs.push(`sonar(0.2) → ${arr.length}`);
      } else {
        attemptLogs.push("sonar(0.2) → network_error");
      }
    }

    // Tentative 4 : fallback "zone élargie" — si toujours vide, on élargit la recherche
    // à la commune voisine / département / région pour les petites villes
    if (restaurants.length === 0) {
      const widerPrompt = `List up to 8 independent restaurants near "${city}" (include nearby towns if "${city}" is very small). For each give: name, address, city, phone, google_rating, reviews_count, category, lat, lng. Reply ONLY with a JSON array, no text around it.`;
      async function callWider(model: string): Promise<{ content: string; citations: any[] } | null> {
        try {
          const res = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: "You are a restaurant finder. Reply ONLY with a JSON array. No text, no markdown." },
                { role: "user", content: widerPrompt },
              ],
              temperature: 0.3,
              max_tokens: 4000,
            }),
            signal: AbortSignal.timeout(40000),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { content: data.choices?.[0]?.message?.content ?? "[]", citations: data.citations ?? [] };
        } catch { return null; }
      }
      const r4 = await callWider("sonar-pro");
      if (r4) {
        const arr = tryParse(r4.content);
        if (arr.length > 0) { restaurants = arr; citations = r4.citations; }
        attemptLogs.push(`sonar-pro-wider → ${arr.length}`);
      }
      // Dernier recours : sonar standard avec prompt minimal
      if (restaurants.length === 0) {
        const r5 = await callWider("sonar");
        if (r5) {
          const arr = tryParse(r5.content);
          if (arr.length > 0) { restaurants = arr; citations = r5.citations; }
          attemptLogs.push(`sonar-wider → ${arr.length}`);
        }
      }
    }

    if (!Array.isArray(restaurants)) restaurants = [];
    console.log("[circuit] FINAL after retries:", restaurants.length, "| attempts:", attemptLogs.join(" | "));

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

    // Re-geocode all addresses via Nominatim for accurate map pins
    // (Perplexity coords are often wrong — OSM is the ground truth)
    restaurants = await geocodeAll(restaurants);
    console.log("[circuit] after geocoding:", restaurants.filter(r => r.lat && r.lng).length, "with coords");

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
      citations,
      attempts: attemptLogs,
      warning: restaurants.length === 0
        ? `Aucun restaurant trouvé après ${attemptLogs.length} tentatives. Causes possibles : ville mal orthographiée, zone très petite, ou indisponibilité Perplexity.`
        : restaurants.length < minCount
          ? `Seulement ${restaurants.length} restaurants trouvés (minimum visé : ${minCount}). La ville/zone est peut-être petite.`
          : null,
    });
  } catch (err: any) {
    console.error("[circuit]", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}
