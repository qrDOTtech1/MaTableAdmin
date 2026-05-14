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
    if (!website) insights.push("n'a pas de site web professionnel — fort potentiel de digitalisation");
    if (google_rating && google_rating >= 3.8 && google_rating <= 4.4) insights.push(`a une excellente note Google de ${google_rating}★ (${reviews_count ?? "?"} avis) qui attire déjà des clients`);
    else if (google_rating) insights.push(`a une note Google de ${google_rating}★ avec ${reviews_count ?? "?"} avis`);

    const scoreContext  = autoScoreLabel ? `Profil : ${autoScoreLabel}` : "";
    const reasonsContext = autoScoreReasons?.length ? `Points clés : ${autoScoreReasons.slice(0, 3).join(", ")}` : "";

    if (!apiKey) {
      return NextResponse.json({ script: buildTemplate(name, city, category, insights), fallback: true });
    }

    const prompt = `Tu es un expert en prospection commerciale B2B pour la restauration.
Tu dois écrire un script d'appel téléphonique de prospection pour MaTable (logiciel tout-en-un : réservations, avis Google auto, carte QR, caisse, fidélité — dès 29€/mois).

RESTAURANT À APPELER :
Nom : "${name}"
Ville : ${city}
Type : ${category ?? "Restaurant"}
${description ? `Description : ${description}` : ""}
${google_rating ? `Note Google : ${google_rating}★ (${reviews_count ?? "?"} avis)` : ""}
${!website ? "⚡ PAS de site web — très fort potentiel" : `Site web : ${website}`}
${scoreContext}
${reasonsContext}

━━━ TECHNIQUE DU "FAUX NON" — OBLIGATOIRE ━━━
Formule TOUTES les demandes d'engagement en négatif pour réduire la résistance :
• "Ça ne vous dérange pas si je vous explique ça en 2 minutes ?"
• "Vous n'êtes pas contre une petite démo de 10 minutes ?"
• "Je peux vous envoyer ça, ça ne vous gêne pas ?"
• "Vous n'êtes pas contre qu'on se fasse un rapide appel cette semaine ?"
→ La personne répond "non, pas de souci" = accord implicite. Réduit la résistance frontale.

━━━ FLEXIBILITÉ ━━━
Si le prospect a un besoin spécifique non couvert par MaTable :
→ Rester honnête mais ouvert : "On travaille dessus / je vois avec l'équipe"
→ Proposer la fonctionnalité la plus proche
→ "On est flexibles, on a souvent trouvé des solutions sur mesure pour des cas comme le vôtre"

━━━ RÈGLES DU SCRIPT ━━━
1. En français naturel et chaleureux (pas corporate)
2. Durée environ 45 secondes à l'oral
3. NE PAS se présenter d'entrée — commencer par l'accroche du restaurant
4. Mentionner 1-2 points SPÉCIFIQUES à ce restaurant
5. Utiliser le "faux non" sur la demande de RDV
6. Finir par une question ouverte souple
7. 2-3 objections avec réponses courtes utilisant aussi le "faux non"

FORMAT de sortie — texte brut structuré :
📞 ACCROCHE
[script principal — naturel, personnalisé, technique du "faux non" sur le RDV]

💡 OBJECTIONS
• [Objection] → [Réponse courte avec "faux non" si possible]
• [Objection] → [Réponse courte]
• [Objection] → [Réponse courte]

Zéro markdown gras/italique. Texte brut uniquement.`;

    const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Tu es un expert en prospection commerciale B2B pour la restauration. Tu maîtrises la technique du 'faux non' et rédiges des scripts percutants, naturels et personnalisés en français." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 900,
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
  const hook = insights.length > 0
    ? `En préparant cet appel, j'ai vu que votre restaurant ${insights[0]}.`
    : `J'ai découvert votre établissement "${name}" à ${city} et j'avais une question rapide pour vous.`;

  return `📞 ACCROCHE

Bonjour ! J'espère que je ne vous dérange pas — je vous appelle au sujet de "${name}".

${hook}

Vous ne seriez pas contre qu'on discute 2 minutes ? Je voulais vous montrer ce que MaTable peut faire pour un restaurant comme le vôtre — réservations en ligne, avis Google automatisés, carte QR digitale, tout depuis un seul outil, sans commission.

Vous n'êtes pas contre une petite démo de 10 minutes cette semaine, que ce soit en visio ou par téléphone ? Je m'adapte à votre emploi du temps.

💡 OBJECTIONS
• Pas le temps en ce moment → Je comprends totalement. Ça ne vous dérange pas si je vous rappelle la semaine prochaine, à l'heure qui vous convient ?
• On a déjà un système → Pas de problème. Vous ne seriez pas contre une comparaison rapide ? Certains clients l'utilisaient en parallèle au départ et ont vite switché.
• Ça coûte combien ? → Ça commence à 29€/mois, et les 14 premiers jours sont offerts sans engagement. Ça ne vous gêne pas qu'on en discute concrètement sur une démo ?
• Je ne suis pas décideur → Aucun souci. Je peux vous préparer un résumé à montrer à votre associé, ça ne vous dérange pas ?`;
}
