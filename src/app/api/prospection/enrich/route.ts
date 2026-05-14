import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/prospection/enrich  { id, name, city, address? }
// Re-queries Perplexity for a single restaurant and updates DB
export async function POST(req: Request) {
  try {
    const rows = await prisma.$queryRaw<Array<{ perplexityApiKey: string | null }>>`
      SELECT "perplexityApiKey" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ perplexityApiKey: null }]);

    const apiKey = rows[0]?.perplexityApiKey;
    if (!apiKey) return NextResponse.json({ error: "no_key" }, { status: 400 });

    const { id, name, city, address } = await req.json();
    if (!name || !city) return NextResponse.json({ error: "name_city_required" }, { status: 400 });

    const locationHint = address ? `situé au ${address}` : `dans la ville de ${city}`;

    const prompt = `Recherche en temps réel sur Google Maps, Pages Jaunes et Tripadvisor les informations complètes et à jour pour ce restaurant français :

Nom : "${name}"
Ville : ${city}
${address ? `Adresse connue : ${address}` : ""}

Cherche ACTIVEMENT :
1. Le numéro de téléphone sur Google Maps (fiche établissement) et Pages Jaunes — c'est la donnée la plus importante
2. Le site web officiel
3. La note Google et le nombre d'avis
4. Les coordonnées GPS exactes
5. L'URL Google Maps directe

Réponds UNIQUEMENT avec un objet JSON (pas un tableau, un objet seul) :
{"name":"${name}","address":"adresse complète avec code postal","city":"${city}","phone":"0X XX XX XX XX ou null","website":"https://... ou null","google_rating":4.2,"reviews_count":150,"category":"type de cuisine","description":"1 phrase","lat":48.8566,"lng":2.3522,"google_maps_url":"https://maps.google.com/..."}

ZÉRO texte avant ou après. JSON pur.`;

    const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en recherche d'informations sur les restaurants français. Tu consultes Google Maps, Pages Jaunes et Tripadvisor pour trouver des données précises et actuelles. Tu réponds uniquement en JSON valide.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!pRes.ok) {
      const err = await pRes.text();
      return NextResponse.json({ error: "perplexity_error", message: err }, { status: 502 });
    }

    const pData = await pRes.json();
    const content: string = pData.choices?.[0]?.message?.content ?? "{}";

    let enriched: Record<string, any> = {};
    try {
      const clean = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      // Handle both object and array responses
      const parsed = JSON.parse(clean);
      enriched = Array.isArray(parsed) ? parsed[0] ?? {} : parsed;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) { try { enriched = JSON.parse(match[0]); } catch {} }
    }

    // Normalize phone
    let phone = enriched.phone ? String(enriched.phone) : null;
    if (phone) {
      let p = phone.replace(/\s+/g, "").replace(/[.\-()]/g, "");
      if (p.startsWith("+33")) p = "0" + p.slice(3);
      if (p.startsWith("0033")) p = "0" + p.slice(4);
      p = p.replace(/\D/g, "");
      if (p.length === 10 && p.startsWith("0")) {
        phone = p.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
      } else {
        phone = null;
      }
    }

    // Build update fields (only overwrite if we got better data)
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (phone) updates.phone = phone;
    if (enriched.website) updates.website = enriched.website;
    if (enriched.address) updates.address = enriched.address;
    if (enriched.category) updates.category = enriched.category;
    if (enriched.description) updates.description = enriched.description;
    if (enriched.lat) updates.lat = Number(enriched.lat);
    if (enriched.lng) updates.lng = Number(enriched.lng);
    if (enriched.google_maps_url) updates.sourceUrl = enriched.google_maps_url;

    // Update DB if we have an id
    if (id) {
      const setClause = Object.entries(updates)
        .filter(([k]) => k !== "updatedAt")
        .map(([k]) => `"${k}" = COALESCE("${k}", $${Object.keys(updates).indexOf(k) + 1})`)
        .join(", ");

      if (phone || enriched.website || enriched.lat) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Prospect" SET
            phone = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE phone END,
            website = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE website END,
            address = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE address END,
            category = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE category END,
            description = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE description END,
            lat = CASE WHEN $6::float IS NOT NULL THEN $6 ELSE lat END,
            lng = CASE WHEN $7::float IS NOT NULL THEN $7 ELSE lng END,
            "sourceUrl" = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE "sourceUrl" END,
            "updatedAt" = NOW()
          WHERE id = $9`,
          phone ?? null,
          enriched.website ?? null,
          enriched.address ?? null,
          enriched.category ?? null,
          enriched.description ?? null,
          enriched.lat ? Number(enriched.lat) : null,
          enriched.lng ? Number(enriched.lng) : null,
          enriched.google_maps_url ?? null,
          id,
        ).catch(err => console.error("[enrich update]", err));
      }
    }

    return NextResponse.json({
      ok: true,
      updated: {
        phone,
        website: enriched.website ?? null,
        address: enriched.address ?? null,
        category: enriched.category ?? null,
        description: enriched.description ?? null,
        lat: enriched.lat ? Number(enriched.lat) : null,
        lng: enriched.lng ? Number(enriched.lng) : null,
        google_maps_url: enriched.google_maps_url ?? null,
      },
    });
  } catch (err: any) {
    console.error("[enrich]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
