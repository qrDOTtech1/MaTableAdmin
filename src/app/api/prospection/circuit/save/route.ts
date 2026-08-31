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

    // Build a key for each input row, then look up all existing prospects in one query
    // to avoid the previous N+1 pattern (1 SELECT + 1 UPDATE/INSERT per restaurant).
    const keyOf = (name: string, city: string) => `${name.toLowerCase()}||${city.toLowerCase()}`;
    const inputs = restaurants.map((r) => ({ r, city: r.city ?? searchCity ?? "" }));

    const names = Array.from(new Set(inputs.map((i) => i.r.name.toLowerCase())));
    const cities = Array.from(new Set(inputs.map((i) => i.city.toLowerCase())));
    const candidates = names.length === 0 ? [] : await prisma.$queryRaw<Array<{ id: string; name: string; city: string | null }>>`
      SELECT id, name, COALESCE(city, '') AS city
      FROM "Prospect"
      WHERE LOWER(name) = ANY(${names}::text[])
        AND LOWER(COALESCE(city, '')) = ANY(${cities}::text[])
    `;

    const existingByKey = new Map<string, string>();
    for (const row of candidates) {
      existingByKey.set(keyOf(row.name, row.city ?? ""), row.id);
    }

    const toUpdate: Array<{ id: string; r: typeof inputs[number]["r"] }> = [];
    const toInsert: typeof inputs = [];
    for (const item of inputs) {
      const id = existingByKey.get(keyOf(item.r.name, item.city));
      if (id) toUpdate.push({ id, r: item.r });
      else toInsert.push(item);
    }

    const ops: Array<Promise<unknown>> = [];
    for (const { id, r } of toUpdate) {
      ops.push(prisma.$executeRawUnsafe(
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
        id,
      ));
    }
    for (const { r, city } of toInsert) {
      ops.push(prisma.$executeRawUnsafe(
        `INSERT INTO "Prospect"
          (id, name, city, address, phone, email, website, description, category, "imageUrl", "sourceUrl", status, "lat", "lng", source, score, "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), $1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, 'NEW', $10, $11, 'circuit', $12, NOW(), NOW())`,
        r.name,
        city || null,
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
      ));
    }

    await Promise.all(ops);

    return NextResponse.json({ ok: true, saved: toInsert.length, skipped: toUpdate.length });
  } catch (err: any) {
    console.error("[circuit/save]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
