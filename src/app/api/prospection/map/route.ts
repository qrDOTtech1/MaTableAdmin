import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ensure columns. Schema-drift errors are non-fatal here (column may
    // already exist or the role may lack DDL), so we log + continue rather
    // than fail the whole request — but we no longer silently swallow.
    const logDdl = (col: string) => (err: unknown) => {
      console.warn(`[map] ensure column ${col} skipped:`, err);
    };
    await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "lat" FLOAT`).catch(logDdl("lat"));
    await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "lng" FLOAT`).catch(logDdl("lng"));
    await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'scraper'`).catch(logDdl("source"));
    await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "score" TEXT`).catch(logDdl("score"));

    const rows = await prisma.$queryRaw<Array<{
      id: string; name: string; city: string | null; address: string | null;
      phone: string | null; email: string | null; website: string | null;
      category: string | null; description: string | null; imageUrl: string | null;
      sourceUrl: string | null; status: string; restaurantId: string | null;
      notes: string | null; lat: number | null; lng: number | null;
      source: string | null; score: string | null; activatedAt: Date | null; createdAt: Date;
    }>>`
      SELECT id, name, city, address, phone, email, website, category, description,
             "imageUrl", "sourceUrl", status, "restaurantId", notes,
             "lat", "lng", source, score, "activatedAt", "createdAt"
      FROM "Prospect"
      WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 500
    `.catch((err) => {
      // Log so a missing schema doesn't masquerade as "no prospects".
      console.warn("[map] prospect query failed, returning empty list:", err);
      return [];
    });

    const activatedIds = rows.filter(r => r.restaurantId).map(r => r.restaurantId!);
    let slugMap: Record<string, string> = {};
    if (activatedIds.length > 0) {
      const slugs = await prisma.restaurant.findMany({
        where: { id: { in: activatedIds } },
        select: { id: true, slug: true },
      });
      for (const s of slugs) if (s.slug) slugMap[s.id] = s.slug;
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
