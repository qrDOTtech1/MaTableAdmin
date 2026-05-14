import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const rows = await prisma.$queryRaw<Array<{ perplexityApiKey: string | null }>>`
      SELECT "perplexityApiKey" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ perplexityApiKey: null }]);

    const apiKey = rows[0]?.perplexityApiKey;

    const { name, city, category, phone, website, google_rating, reviews_count, description, autoScoreLabel, autoScoreReasons } = await req.json();

    // Build contextual insights
    const insights: string[] = [];
    if (!website) insights.push("n'a pas de site web professionnel");
    if (google_rating && google_rating >= 3.8 && google_rating <= 4.4) insights.push(`a une excellente note Google de ${google_rating}★ (${reviews_count ?? "?"} avis) — il attire déjà des clients`);
    else if (google_rating) insights.push(`a une note Google de ${google_rating}★ avec ${reviews_count ?? "?"} avis`);
    if (!phone) insights.push("le numéro a été trouvé dans nos recherches");

    const scoreContext = autoScoreLabel ? `Profil : ${autoScoreLabel}` : "";
    const reasonsContext = autoScoreReasons?.length ? `Points clés : ${autoScoreReasons.slice(0, 3).join(", ")}` : "";

    // If no API key, return a solid template
    if (!apiKey) {
      return NextResponse.json({ script: buildTemplate(name, city, category, insights), fallback: true });
    }

    const prompt = `Tu es un commercial expert pour MaTable, un logiciel de gestion de restaurant tout-en-un (réservations, avis Google, carte digitale, caisse, fidélité).

Tu dois écrire un script d'appel téléphonique de prospection COURT et EFFICACE pour contacter ce restaurant :

Restaurant : "${name}"
Ville : ${city}
Type : ${category ?? "Restaurant"}
${description ? `Description : ${description}` : ""}
${google_rating ? `Note Google : ${google_rating}★ (${reviews_count ?? "?"} avis)` : ""}
${!website ? "⚡ PAS de site web — fort potentiel de digitalisation" : `Site web : ${website}`}
${scoreContext}
${reasonsContext}

Le script doit :
1. Être en français, naturel et chaleureux (pas corporate)
2. Durer environ 45 secondes à lire
3. Commencer par "Bonjour, [nom du contact si connu / Monsieur ou Madame], c'est [Prénom] de MaTable..."
4. Mentionner 1 ou 2 points SPÉCIFIQUES à ce restaurant (sa note, son absence de site, son type de cuisine...)
5. Expliquer en 1 phrase ce que fait MaTable
6. Terminer par une question ouverte pour obtenir un RDV ou une démo
7. Inclure en dessous 2-3 OBJECTIONS COURANTES avec réponses rapides (format "Objection → Réponse")

Format de sortie — texte brut structuré avec ces sections :
📞 ACCROCHE
[texte du script principal]

💡 OBJECTIONS
• [Objection] → [Réponse courte]
• [Objection] → [Réponse courte]

Zéro markdown gras/italique. Texte brut uniquement.`;

    const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Tu es un expert en prospection commerciale B2B pour la restauration. Tu écris des scripts d'appel percutants, naturels et personnalisés en français." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 800,
      }),
    });

    if (!pRes.ok) {
      return NextResponse.json({ script: buildTemplate(name, city, category, insights), fallback: true });
    }

    const pData = await pRes.json();
    const script = pData.choices?.[0]?.message?.content ?? buildTemplate(name, city, category, insights);

    return NextResponse.json({ script, fallback: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildTemplate(name: string, city: string, category?: string, insights: string[] = []): string {
  const hook = insights.length > 0 ? `En préparant notre appel, j'ai remarqué que votre restaurant ${insights[0]}.` : `J'ai découvert votre restaurant "${name}" à ${city} et je voulais vous contacter directement.`;

  return `📞 ACCROCHE

Bonjour, c'est [Prénom] de MaTable. Je vous contacte au sujet de "${name}".

${hook}

MaTable, c'est une plateforme tout-en-un pour les restaurants indépendants : réservations en ligne, collecte d'avis Google automatique, carte digitale QR, et gestion de la caisse — tout ça depuis un seul outil, sans commission.

Est-ce que vous avez 10 minutes cette semaine pour que je vous fasse une démo rapide ? Je peux vous montrer exactement comment ça fonctionnerait pour un restaurant comme le vôtre.

💡 OBJECTIONS
• On a déjà un système → Aucun problème, MaTable s'intègre ou remplace — je vous montre la différence en 5 min.
• Pas le temps en ce moment → Je comprends, c'est pour ça que la démo dure 10 min chrono, à l'heure qui vous convient.
• Ça coûte combien ? → On commence à 29€/mois, et les 14 premiers jours sont offerts sans engagement.`;
}
