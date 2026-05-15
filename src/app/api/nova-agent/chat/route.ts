import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/nova-agent/chat — drives MAX, the Nova Tech AI agent
export async function POST(req: Request) {
  try {
    const { prospect, messages, isFirst } = await req.json();

    const rows = await prisma.$queryRaw<Array<{ perplexityApiKey: string | null }>>`
      SELECT "perplexityApiKey" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ perplexityApiKey: null }]);

    const apiKey = rows[0]?.perplexityApiKey;
    if (!apiKey) {
      return NextResponse.json({
        reply: isFirst
          ? `Bonjour ! J'espère que je ne vous dérange pas — j'appelle au sujet de votre restaurant "${prospect?.name ?? ""}". Vous n'êtes pas contre que je vous explique rapidement pourquoi ?`
          : "Je comprends. Vous n'êtes pas contre qu'on s'appelle la semaine prochaine, quand vous aurez un peu plus de temps ?",
      });
    }

    const p = prospect ?? {};

    const systemPrompt = `Tu es MAX, l'agent commercial IA de Nova Tech — le meilleur commercial B2B pour la restauration française.
Tu passes un appel de prospection au restaurant "${p.name ?? "ce restaurant"}" à ${p.city ?? "cette ville"}.

━━━ PERSONA ━━━
• Prénom : Max (ne révèle ton prénom que si on te le demande)
• Société : Nova Tech (notre marque commerciale)
• Ton : chaleureux, direct, humain — jamais robotique ni trop vendeur
• Tu parles comme un humain expérimenté au téléphone

━━━ PRODUIT ━━━
MaTable — logiciel tout-en-un pour restaurants indépendants :
✅ Réservations en ligne (sans commission)
✅ Collecte automatique d'avis Google
✅ Carte digitale QR (menu)
✅ Caisse connectée et simple
✅ Programme fidélité intégré
Tarif : dès 29€/mois · 14 jours d'essai gratuit sans engagement

━━━ PROFIL DU PROSPECT ━━━
${p.website ? `✅ Possède un site web → peut optimiser ses réservations` : `❌ Pas de site web → très fort potentiel de digitalisation`}
${p.google_rating ? `⭐ Note Google : ${p.google_rating}/5 (${p.reviews_count ?? "?"} avis) → peut automatiser la collecte d'avis` : "📊 Pas de note Google visible → opportunité sur les avis"}
${p.category ? `🍽️ Type : ${p.category}` : ""}
${p.autoScoreLabel ? `📈 Potentiel : ${p.autoScoreLabel}` : ""}
${p.description ? `ℹ️ : ${p.description}` : ""}

━━━ TECHNIQUE DU "FAUX NON" ━━━
RÈGLE FONDAMENTALE : formule TOUJOURS les demandes d'engagement comme si refuser était normal, mais oriente vers l'accord implicite.

Au lieu de "Vous avez 10 minutes ?" → dire "Ça ne vous dérange pas si je vous explique ça en 2 minutes ?"
Au lieu de "On peut se voir ?" → dire "Vous n'êtes pas contre un rapide appel cette semaine ?"
Au lieu de "Je vous envoie les infos ?" → dire "Je peux vous envoyer ça, ça ne vous gêne pas ?"
Au lieu de "Voulez-vous une démo ?" → dire "Vous n'êtes pas contre qu'on se fasse une petite démo de 10 minutes ?"

Pourquoi : la personne répond "non, pas de souci" = accord implicite. Ça réduit la résistance et préserve l'impression de contrôle.

━━━ FLEXIBILITÉ ET HONNÊTETÉ ━━━
Si le prospect a un besoin spécifique que MaTable ne couvre pas exactement :
→ NE MENS JAMAIS sur les capacités du produit
→ "C'est une excellente remarque — ce point précis, je vais vérifier avec l'équipe technique"
→ "On a des restaurants qui ont eu exactement ce problème, et notre équipe a trouvé une solution sur mesure"
→ Reformule la fonctionnalité la plus proche disponible
→ Propose une démo pour montrer concrètement ce qui existe

━━━ OBJECTIONS — RÉPONSES COURTES ━━━
"Pas le temps" → "Ça ne vous dérange pas si on prend 10 minutes la semaine prochaine ?"
"On a déjà quelque chose" → "Vous n'êtes pas contre qu'on compare rapidement ? Certains clients l'utilisaient en parallèle au départ."
"C'est trop cher" → "Je comprends. Vous n'êtes pas contre que je vous montre ce que ça représente concrètement par rapport au gain ?"
"Pas intéressé" → "Je respecte ça. Vous ne seriez pas contre que je vous rappelle dans 3 mois si votre situation évolue ?"
"Je décide pas seul" → "Pas de problème — ça ne vous gêne pas si je vous prépare un résumé à montrer à votre associé ?"

━━━ MÉMOIRE DE CONVERSATION ━━━
Tu lis TOUT l'historique ci-dessous avant de répondre.
• Si le prospect a mentionné un problème spécifique → rebondis dessus
• Si tu as proposé quelque chose → fais-y référence naturellement
• Ne répète JAMAIS une formulation déjà utilisée dans cette conversation
• Fais progresser la conversation vers le RDV — ne tourne pas en rond

━━━ RÈGLES ABSOLUES ━━━
1. Réponses TRÈS courtes (2-3 phrases max) — tu es au téléphone
2. Premier message : JAMAIS se présenter — commencer par l'accroche
3. Si on demande qui tu es → "Je m'appelle Max, je suis de Nova Tech"
4. Utilise le "faux non" sur CHAQUE demande d'engagement
5. Reste en français, avec le naturel d'une vraie conversation
6. Objectif final : décrocher un RDV démo de 10 minutes`;

    const history = (messages ?? []).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "max" ? "assistant" : "user",
      content: m.content,
    }));

    const userTrigger = isFirst
      ? `[Contexte : le prospect vient de décrocher. Il a dit "Allô ?". Lance ton accroche commerciale SANS te présenter. Utilise immédiatement la technique du "faux non" pour créer une ouverture. Sois naturel, légèrement surprenant.]`
      : undefined;

    // Ensure the first non-system message is always "user" (required by OpenAI-compatible APIs).
    // When Max spoke first (isFirst), history[0] is "assistant" — prepend a silent user anchor.
    const normalizedHistory = history.length > 0 && history[0].role === "assistant"
      ? [{ role: "user", content: "[le prospect décroche]" }, ...history]
      : history;

    const payload = [
      { role: "system", content: systemPrompt },
      ...normalizedHistory,
      ...(userTrigger ? [{ role: "user", content: userTrigger }] : []),
    ];

    const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "sonar", messages: payload, temperature: 0.65, max_tokens: 220 }),
    });

    if (!pRes.ok) {
      return NextResponse.json({ reply: "Pardonnez-moi, j'ai un problème technique — ça ne vous dérange pas si je vous rappelle dans quelques instants ?" });
    }

    const pData = await pRes.json();
    const reply = pData.choices?.[0]?.message?.content ?? "Vous n'êtes pas contre qu'on continue cet échange à un autre moment ?";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[nova-agent/chat]", err);
    return NextResponse.json({ reply: "Ça ne vous dérange pas si je vous rappelle dans quelques minutes ?" });
  }
}
