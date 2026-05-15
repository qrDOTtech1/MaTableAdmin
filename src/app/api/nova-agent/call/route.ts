import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/nova-agent/call
// Trigger a real outbound AI call via Vapi.ai
export async function POST(req: Request) {
  try {
    const rows = await prisma.$queryRaw<Array<{
      vapiApiKey: string | null;
      vapiPhoneNumberId: string | null;
      elevenLabsVoiceId: string | null;
      perplexityApiKey: string | null;
    }>>`
      SELECT "vapiApiKey", "vapiPhoneNumberId", "elevenLabsVoiceId", "perplexityApiKey"
      FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ vapiApiKey: null, vapiPhoneNumberId: null, elevenLabsVoiceId: null, perplexityApiKey: null }]);

    const cfg = rows[0] ?? {};
    if (!cfg.vapiApiKey) {
      return NextResponse.json({ error: "no_vapi_key", message: "Clé Vapi non configurée" }, { status: 400 });
    }
    if (!cfg.vapiPhoneNumberId) {
      return NextResponse.json({ error: "no_phone_number", message: "Numéro de téléphone Vapi non configuré" }, { status: 400 });
    }

    const { prospect } = await req.json();
    if (!prospect?.phone) {
      return NextResponse.json({ error: "no_phone", message: "Ce prospect n'a pas de numéro de téléphone" }, { status: 400 });
    }

    // Build Max's system prompt
    const p = prospect;
    const systemPrompt = `Tu es MAX, l'agent commercial IA de Nova Tech.
Tu appelles le restaurant "${p.name}" à ${p.city}.
${p.website ? `Il a un site web.` : `Il n'a PAS de site web — opportunité forte !`}
${p.google_rating ? `Sa note Google est ${p.google_rating}/5 (${p.reviews_count ?? "?"} avis).` : ""}
${p.category ? `Type de cuisine : ${p.category}.` : ""}

Tu vends MaTable : logiciel tout-en-un (réservations, avis Google auto, carte QR, caisse, fidélité) à partir de 29€/mois.
Commence par une accroche naturelle. Ne te présente pas d'emblée.
Si on te demande qui tu es : "Je m'appelle Max, je suis de Nova Tech."
Sois court, naturel, humain. Objectif : décrocher un RDV démo de 10 minutes.
Parle UNIQUEMENT en français.`;

    // Normalize French phone number
    let phone = p.phone.replace(/\s/g, "").replace(/[.\-()]/g, "");
    if (phone.startsWith("0")) phone = "+33" + phone.slice(1);
    if (!phone.startsWith("+")) phone = "+" + phone;

    // Build Vapi assistant config
    const assistantConfig: any = {
      name: "Max — Nova Tech",
      firstMessage: `Bonjour ! ${p.name ? `Je vous contacte au sujet de votre restaurant.` : "J'espère que vous allez bien !"}`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.7,
        maxTokens: 150,
      },
      voice: cfg.elevenLabsVoiceId
        ? {
            provider: "11labs",
            voiceId: cfg.elevenLabsVoiceId,
            stability: 0.5,
            similarityBoost: 0.8,
          }
        : {
            provider: "vapi",
            voiceId: "Emma",
          },
      transcriber: {
        provider: "deepgram",
        language: "fr",
      },
      endCallFunctionEnabled: true,
      endCallMessage: "Merci beaucoup pour votre temps. Passez une excellente journée ! Au revoir.",
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 600,
    };

    // Create Vapi outbound call
    const vapiRes = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: cfg.vapiPhoneNumberId,
        customer: { number: phone, name: p.name },
        assistant: assistantConfig,
      }),
    });

    if (!vapiRes.ok) {
      const err = await vapiRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: "vapi_error", message: err.message ?? "Erreur Vapi", details: err },
        { status: 502 }
      );
    }

    const vapiData = await vapiRes.json();

    return NextResponse.json({
      ok: true,
      callId: vapiData.id,
      status: vapiData.status,
      startedAt: vapiData.createdAt,
    });
  } catch (err: any) {
    console.error("[nova-agent/call]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/nova-agent/call?callId=xxx — get Vapi call status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const callId = searchParams.get("callId");
    if (!callId) return NextResponse.json({ error: "no_call_id" }, { status: 400 });

    const rows = await prisma.$queryRaw<Array<{ vapiApiKey: string | null }>>`
      SELECT "vapiApiKey" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `.catch(() => [{ vapiApiKey: null }]);

    const apiKey = rows[0]?.vapiApiKey;
    if (!apiKey) return NextResponse.json({ error: "no_key" }, { status: 400 });

    const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!res.ok) return NextResponse.json({ error: "vapi_error" }, { status: 502 });
    const data = await res.json();

    return NextResponse.json({
      id: data.id,
      status: data.status,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      endedReason: data.endedReason,
      transcript: data.transcript,
      summary: data.analysis?.summary,
      cost: data.cost,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
