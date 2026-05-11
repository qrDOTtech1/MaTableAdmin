/**
 * /api/documents
 *
 *  GET  ?restaurantId=… → liste les documents (filtré ou global), ordre desc.
 *  POST                 → crée un document généré (classeur virtuel)
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

  const docs = await prisma.generatedDocument.findMany({
    where: {
      ...(restaurantId ? { restaurantId } : {}),
      ...(type ? { type } : {}),
    },
    include: { restaurant: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { restaurantId, type, number, title, totalCents, vendor, client, data } = body;

    if (!restaurantId || !type || !number || !title) {
      return NextResponse.json(
        { error: "restaurantId, type, number, title requis" },
        { status: 400 }
      );
    }

    // Sanity check : le restaurant existe
    const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
    if (!r) return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });

    const doc = await prisma.generatedDocument.create({
      data: {
        restaurantId,
        type,
        number,
        title,
        totalCents: Number(totalCents ?? 0),
        vendor: vendor ?? {},
        client: client ?? {},
        data: data ?? {},
        createdBy: (session as any).username ?? null,
      },
    });

    return NextResponse.json({ ok: true, document: doc });
  } catch (e: any) {
    console.error("[POST /api/documents]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Erreur" }, { status: 500 });
  }
}
