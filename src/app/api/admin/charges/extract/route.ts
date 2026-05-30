/**
 * /api/admin/charges/extract
 *
 * Analyse une facture (image) avec le modèle vision Ollama Cloud et
 * retourne les champs structurés à pré-remplir dans le formulaire.
 *
 * Entrée : multipart/form-data avec "file" (image JPG/PNG).
 * Sortie : { supplier, label, dateIssued, amountHt, vatRatePct, suggestedCategory }
 *
 * Note : les PDF ne sont pas supportés directement par le modèle vision.
 * Pour un PDF, demandez à l'utilisateur d'uploader une photo.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const ALLOWED_CATEGORIES = [
  "SERVEUR", "IA_API", "TELEPHONIE", "LOGICIEL_SAAS",
  "MARKETING", "FOURNITURES", "DEPLACEMENT", "AUTRE",
];

async function getOllamaConfig(): Promise<{ apiKey: string; visionModel: string } | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ ollamaApiKey: string | null; ollamaVisionModel: string | null }>>(
      `SELECT "ollamaApiKey", "ollamaVisionModel" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1`
    );
    const row = rows[0];
    if (!row?.ollamaApiKey) return null;
    return { apiKey: row.ollamaApiKey, visionModel: row.ollamaVisionModel ?? "qwen3-vl:235b" };
  } catch { return null; }
}

const EXTRACT_PROMPT = `Tu es un assistant qui analyse une facture fournisseur française.
Extrais les informations suivantes au format JSON strict (pas de markdown, pas de commentaire) :
{
  "supplier": "nom complet du fournisseur (entreprise émettrice)",
  "label": "objet/libellé court de la facture (ex: 'Abonnement serveur Avril')",
  "dateIssued": "date d'émission au format YYYY-MM-DD",
  "amountHt": montant total HT en euros sous forme de nombre (ex: 49.90),
  "vatRatePct": taux de TVA principal en pourcentage (20, 10, 5.5 ou 0),
  "suggestedCategory": une valeur parmi SERVEUR (hébergement/cloud), IA_API (Anthropic/OpenAI/Ollama), TELEPHONIE (Free, Orange, internet), LOGICIEL_SAAS (Notion, Github, autres SaaS), MARKETING (pub, ads, agence), FOURNITURES (papeterie, matériel bureau), DEPLACEMENT (train, avion, hôtel, taxi), AUTRE
}

Règles :
- Si une info est absente, mets null pour cette clé.
- Pour amountHt : si tu vois seulement TTC + TVA, calcule HT = TTC - TVA. Si TVA absente, prends amountTtc en HT et mets vatRatePct=0.
- Réponds UNIQUEMENT le JSON, rien d'autre.`;

function extractJson(text: string): any {
  // Retire les fences markdown si présents
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON introuvable dans la réponse IA");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const f = fd.get("file");
  if (!f || typeof f !== "object" || !("arrayBuffer" in f)) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  const file = f as File;
  const mime = file.type || "application/octet-stream";

  if (mime.startsWith("application/pdf")) {
    return NextResponse.json({
      error: "Pour l'extraction IA, uploadez une photo (JPG/PNG) plutôt qu'un PDF. Vous pourrez ensuite joindre le PDF original en pièce.",
    }, { status: 415 });
  }
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Type non supporté — image attendue (JPG/PNG)" }, { status: 415 });
  }

  const cfg = await getOllamaConfig();
  if (!cfg) {
    return NextResponse.json({ error: "Clé Ollama non configurée (Admin → Configuration)" }, { status: 503 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image trop volumineuse (max 8 Mo). Compressez-la." }, { status: 413 });
  }
  const b64 = buf.toString("base64");

  // Appel Ollama Cloud vision en STREAM — on forwarde au client (SSE-like)
  // afin qu'il voie l'IA répondre en direct au lieu d'attendre la fin.
  let ollamaRes: Response;
  try {
    ollamaRes = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.visionModel,
        messages: [{ role: "user", content: EXTRACT_PROMPT, images: [b64] }],
        stream: true,
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Connexion Ollama : ${e?.message ?? "réseau"}` }, { status: 502 });
  }
  if (!ollamaRes.ok || !ollamaRes.body) {
    const errBody = await ollamaRes.text().catch(() => "");
    return NextResponse.json({ error: `Ollama ${ollamaRes.status}: ${errBody.slice(0, 200)}` }, { status: 502 });
  }

  // On lit chaque ligne NDJSON d'Ollama, on accumule le texte, et on émet
  // des évènements SSE "delta" puis "done" avec le JSON final validé.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = ollamaRes.body!.getReader();
      let buf = "";
      let accum = "";
      function send(event: string, data: any) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }
      send("start", { ok: true });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t) continue;
            try {
              const obj = JSON.parse(t);
              const chunk = obj?.message?.content ?? "";
              if (chunk) {
                accum += chunk;
                send("delta", { chars: accum.length, snippet: accum.slice(-80) });
              }
              if (obj?.done) {
                // Fin du flux → parser le JSON accumulé
                let parsed: any = null;
                try { parsed = extractJson(accum); } catch {}
                const result = parsed ? {
                  supplier: typeof parsed.supplier === "string" ? parsed.supplier : null,
                  label: typeof parsed.label === "string" ? parsed.label : null,
                  dateIssued: typeof parsed.dateIssued === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateIssued) ? parsed.dateIssued : null,
                  amountHt: typeof parsed.amountHt === "number" && Number.isFinite(parsed.amountHt) ? parsed.amountHt : null,
                  vatRatePct: typeof parsed.vatRatePct === "number" && [0, 5.5, 10, 20].includes(parsed.vatRatePct) ? parsed.vatRatePct : null,
                  suggestedCategory: typeof parsed.suggestedCategory === "string" && ALLOWED_CATEGORIES.includes(parsed.suggestedCategory) ? parsed.suggestedCategory : null,
                } : null;
                send("done", { ok: !!result, ...(result ?? { error: "JSON non exploitable", raw: accum.slice(0, 400) }) });
                controller.close();
                return;
              }
            } catch { /* ligne non JSON — on ignore */ }
          }
        }
        send("done", { ok: false, error: "Flux interrompu sans réponse complète", raw: accum.slice(0, 400) });
      } catch (e: any) {
        send("error", { error: e?.message ?? "stream error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
