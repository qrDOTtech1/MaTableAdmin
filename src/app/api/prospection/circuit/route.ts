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
      ? `dans le secteur "${currentSector}" de ${city}`
      : `à ${city}`;

    const excludeBlock = allExcluded.length > 0
      ? `\n\nNE PAS inclure ces restaurants déjà connus (ils sont déjà dans notre base) :\n${allExcluded.slice(0, 60).map(n => `- ${n}`).join("\n")}`
      : "";

    const prompt = `Tu es un expert local de la restauration française. Trouve exactement 15 restaurants indépendants ${zone}, France.

Critères OBLIGATOIRES :
- Restaurants INDÉPENDANTS uniquement (pas de chaînes : McDonald's, KFC, Pizza Hut, Buffalo Grill, etc.)
- Restaurants qui existent RÉELLEMENT et sont actuellement OUVERTS
- Privilégie les restaurants sans site web ou avec un site basique (meilleur potentiel commercial)
- Données les plus récentes et précises possible${excludeBlock}

Pour chaque restaurant, fournis un objet JSON avec EXACTEMENT ces champs :
- name: string — nom exact du restaurant
- address: string — adresse complète (numéro, rue, code postal)
- city: string — "${city}"
- phone: string|null — numéro de téléphone français au format 0X XX XX XX XX (null si inconnu)
- website: string|null — URL complète avec https:// (null si pas de site)
- google_rating: number|null — note Google Maps entre 1.0 et 5.0
- reviews_count: number|null — nombre entier d'avis Google
- category: string — type de cuisine précis (ex: "Bistrot français", "Italien", "Japonais ramen", "Brasserie alsacienne"...)
- description: string — description en 1 phrase courte et précise
- lat: number|null — latitude GPS précise (ex: 48.8566)
- lng: number|null — longitude GPS précise (ex: 2.3522)
- google_maps_url: string|null — URL Google Maps directe

RÉPONDS UNIQUEMENT avec un tableau JSON valide, aucun texte avant ou après, aucun markdown.
Format exact : [{"name":"...","address":"...","city":"${city}",...}]`;

    const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant expert en restauration locale française. Tu fournis uniquement des données JSON précises et vérifiables sur des restaurants réels. Zéro texte hors JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 6000,
      }),
    });

    if (!pRes.ok) {
      const errText = await pRes.text();
      return NextResponse.json({ error: "perplexity_error", message: errText }, { status: 502 });
    }

    const pData = await pRes.json();
    const content: string = pData.choices?.[0]?.message?.content ?? "[]";

    let restaurants: CircuitRestaurant[] = [];
    try {
      const clean = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      restaurants = JSON.parse(clean);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        try { restaurants = JSON.parse(match[0]); } catch {}
      }
    }
    if (!Array.isArray(restaurants)) restaurants = [];

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
