import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Ensure lat/lng/source columns exist on Prospect
async function ensureColumns() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "lat" FLOAT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "lng" FLOAT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'scraper'`);
}

export interface CircuitSaveBody {
  restaurants: Array<{
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    website?: string;
    google_rating?: number;
    reviews_count?: number;
    category?: string;
    description?: string;
    lat?: number;
    lng?: number;
    google_maps_url?: string;
    photo_url?: string;
    autoScore?: number;
    autoScoreEmoji?: string;
  }>;
  searchCity: string;
}

// POST /api/prospection/circuit/save
export async function POST(req: Request) {
  try {
    await ensureColumns();
    const { restaurants, searchCity }: CircuitSaveBody = await req.json();
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      return NextResponse.json({ error: "no_restaurants" }, { status: 400 });
    }

    let saved = 0;
    let skipped = 0;

    // 1) Fetch every existing prospect (name+city match) in a single query
    //    instead of N sequential SELECTs — turns O(N) round-trips into O(1).
    const normalized = restaurants.map((r) => ({
      raw: r,
      nameKey: r.name.toLowerCase(),
      cityKey: (r.city ?? searchCity ?? "").toLowerCase(),
    }));
    const names = normalized.map((n) => n.nameKey);
    const cities = normalized.map((n) => n.cityKey);
    const existingRows = names.length > 0
      ? await prisma.$queryRaw<Array<{ id: string; nameKey: string; cityKey: string }>>`
          SELECT id, LOWER(name) AS "nameKey", LOWER(COALESCE(city, '')) AS "cityKey"
          FROM "Prospect"
          WHERE LOWER(name) = ANY(${names}::text[])
            AND LOWER(COALESCE(city, '')) = ANY(${cities}::text[])
        `
      : [];
    const existingMap = new Map<string, string>();
    for (const row of existingRows) existingMap.set(`${row.nameKey}::${row.cityKey}`, row.id);

    // 2) Route each incoming row to update-vs-insert; batch the updates so the
    //    common "circuit re-saved" case stays fast, but still fall back to
    //    per-row updates when non-null lat/lng/phone/website need to be filled.
    for (const { raw: r, nameKey, cityKey } of normalized) {
      const existingId = existingMap.get(`${nameKey}::${cityKey}`);
      if (existingId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Prospect" SET
            "lat" = COALESCE("lat", $1),
            "lng" = COALESCE("lng", $2),
            "phone" = COALESCE("phone", $3),
            "website" = COALESCE("website", $4),
            "imageUrl" = COALESCE("imageUrl", $5),
            "source" = COALESCE("source", 'circuit'),
            "updatedAt" = NOW()
          WHERE id = $6`,
          r.lat ?? null,
          r.lng ?? null,
          r.phone ?? null,
          r.website ?? null,
          r.photo_url ?? null,
          existingId,
        );
        skipped++;
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Prospect"
            (id, name, city, address, phone, email, website, description, category, "imageUrl", "sourceUrl", status, "lat", "lng", source, score, "createdAt", "updatedAt")
          VALUES
            (gen_random_uuid(), $1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, 'NEW', $10, $11, 'circuit', $12, NOW(), NOW())`,
          r.name,
          r.city ?? searchCity ?? null,
          r.address ?? null,
          r.phone ?? null,
          r.website ?? null,
          r.description ?? null,
          r.category ?? null,
          r.photo_url ?? null,
          r.google_maps_url ?? null,
          r.lat ?? null,
          r.lng ?? null,
          r.autoScoreEmoji ?? null,
        );
        saved++;
      }
    }

    return NextResponse.json({ ok: true, saved, skipped });
  } catch (err: any) {
    console.error("[circuit/save]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
