import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/prospection/map — all prospects with lat/lng (circuit source)
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      city: string | null;
      address: string | null;
      phone: string | null;
      email: string | null;
      website: string | null;
      category: string | null;
      description: string | null;
      imageUrl: string | null;
      sourceUrl: string | null;
      status: string;
      restaurantId: string | null;
      notes: string | null;
      lat: number | null;
      lng: number | null;
      source: string | null;
      activatedAt: Date | null;
      createdAt: Date;
    }>>`
      SELECT id, name, city, address, phone, email, website, category, description,
             "imageUrl", "sourceUrl", status, "restaurantId", notes,
             "lat", "lng", source, "activatedAt", "createdAt"
      FROM "Prospect"
      WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 500
    `.catch(() => []);

    // Also get restaurant slug for activated ones
    const activatedIds = rows.filter(r => r.restaurantId).map(r => r.restaurantId!);
    let slugMap: Record<string, string> = {};
    if (activatedIds.length > 0) {
      const slugs = await prisma.restaurant.findMany({
        where: { id: { in: activatedIds } },
        select: { id: true, slug: true },
      });
      for (const s of slugs) slugMap[s.id] = s.slug;
    }

    return NextResponse.json({
      prospects: rows.map(r => ({
        ...r,
        lat: r.lat ? Number(r.lat) : null,
        lng: r.lng ? Number(r.lng) : null,
        slug: r.restaurantId ? slugMap[r.restaurantId] ?? null : null,
      })),
    });
  } catch (err: any) {
    console.error("[map]", err);
    return NextResponse.json({ prospects: [] });
  }
}
