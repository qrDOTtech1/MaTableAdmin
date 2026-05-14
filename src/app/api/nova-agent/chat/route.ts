import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/nova-agent/chat
// Drives MAX, the Nova Tech AI commercial agent
export async function POST(req: Request) {
  try {
    const { prospect, messages, isFirst } = await req.json();

    // Get Perplexity key
    const rows = await prisma.$queryRaw<Array<{ perplexityApiKey: string | null }>>`
      SELECT "perplexityApiKey" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ perplexityApiKey: null }]);

    const apiKey = rows[0]?.perplexityApiKey;
    if (!apiKey) {
      // Fallback hardcoded response
      return NextResponse.json({
        reply: isFirst
          ? `Bonjour ! J'espère ne pas vous déranger — je vous contacte au sujet de votre restaurant "${prospect?.name}". On travaille avec plusieurs établissements dans votre secteur et j'aurais une solution qui pourrait vous intéresser. Vous avez 2 minutes ?`
          : "Je comprends tout à fait. Est-ce qu'on pourrait convenir d'un moment pour que je vous présente ça en 10 minutes chrono ?",
      });
    }

    const p = prospect ?? {};
    const systemPrompt = `Tu es MAX, le meilleur agent commercial IA de Nova Tech.
Tu passes un appel téléphonique de prospection au restaurant "${p.name ?? "ce restaurant"}" à ${p.city ?? "cette ville"}.

PERSONA DE MAX :
- Prénom : Max (ne révèle ton prénom que si on te le demande directement)
- Société : Nova Tech (notre marque commerciale — ne mentionne pas "MaTable" d'entrée)
- Tu es chaleureux, direct, professionnel, jamais robotique
- Tu parles comme un humain expérimenté au téléphone, avec naturel et conviction

CE QUE TU VENDS — MaTable :
Logiciel tout-en-un pour restaurants indépendants :
• Réservations en ligne sans commission
• Collecte automatique d'avis Google
• Carte digitale QR (menu digital)
• Caisse connectée et simple
• Programme fidélité intégré
Tarif : dès 29€/mois — 14 jours d'essai gratuit sans engagement

PROFIL DE CE RESTAURANT :
${p.website ? `✅ Possède un site web (${p.website})` : "❌ N'a PAS de site web — très fort potentiel de digitalisation !"}
${p.google_rating ? `⭐ Note Google : ${p.google_rating}/5 (${p.reviews_count ?? "?"} avis)` : "📊 Aucune note Google visible"}
${p.category ? `🍽️ Type : ${p.category}` : ""}
${p.autoScoreLabel ? `📈 Potentiel commercial : ${p.autoScoreLabel}` : ""}
${p.description ? `ℹ️ Description : ${p.description}` : ""}

RÈGLES ABSOLUES :
1. Réponses TRÈS courtes (1-3 phrases max) — tu es au téléphone, pas à l'écrit
2. Si c'est ton PREMIER message : commence par l'accroche (PAS de "je suis Max de Nova Tech")
3. Si le prospect demande qui tu es ou d'où tu appelles → "Je m'appelle Max, je suis consultant chez Nova Tech"
4. Face à une objection → une seule phrase percutante, puis rebondir
5. Objectif final : obtenir un RDV démo de 10 minutes (en visio ou téléphone)
6. TOUJOURS en français, avec le naturel d'une vraie conversation
7. Adapte-toi au ton du prospect (hostile → apologétique + direct, ouvert → enthousiaste)`;

    // Build conversation history for Perplexity
    const history = (messages ?? []).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "max" ? "assistant" : "user",
      content: m.content,
    }));

    const userTrigger = isFirst
      ? `[Le prospect vient de décrocher le téléphone. Il a dit "Allô ?" — commence ton accroche commerciale. NE te présente pas encore. Sois naturel et accrocheur.]`
      : undefined;

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...history,
      ...(userTrigger ? [{ role: "user", content: userTrigger }] : []),
    ];

    const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: messagesPayload,
        temperature: 0.75,
        max_tokens: 200,
      }),
    });

    if (!pRes.ok) {
      const err = await pRes.text();
      return NextResponse.json({ error: "perplexity_error", reply: "Désolé, une erreur technique m'empêche de répondre. Pouvez-vous répéter ?" }, { status: 200 });
    }

    const pData = await pRes.json();
    const reply = pData.choices?.[0]?.message?.content ?? "Permettez-moi de reformuler — est-ce qu'un RDV de 10 minutes vous conviendrait ?";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[nova-agent/chat]", err);
    return NextResponse.json({ reply: "Pardonnez-moi, j'ai une légère perturbation — pouvez-vous me rappeler dans quelques instants ?" });
  }
}
