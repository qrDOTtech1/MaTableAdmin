import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Auth machine dédiée au bot de prospection — distincte de la session admin
// humaine (cookie JWT). Le bot envoie sa clé dans le header X-Bot-Key.
function autoriser(req: NextRequest): boolean {
  const cle = process.env.BOT_API_KEY;
  if (!cle) return false; // pas de clé configurée = accès désactivé par défaut
  return req.headers.get("x-bot-key") === cle;
}

export async function GET(req: NextRequest) {
  if (!autoriser(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const toFilter = url.searchParams.get("to");
  const depuis = url.searchParams.get("depuis"); // ISO date, optionnel

  try {
    const where: any = {};
    if (toFilter) where.to = { contains: toFilter, mode: "insensitive" };
    if (depuis) where.createdAt = { gte: new Date(depuis) };

    const emails = await prisma.receivedEmail.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, from: true, to: true, subject: true, text: true, createdAt: true },
    });

    return NextResponse.json({ emails });
  } catch (e: any) {
    console.error("[bot emails]", e?.message);
    return NextResponse.json({ emails: [], error: e?.message }, { status: 500 });
  }
}
