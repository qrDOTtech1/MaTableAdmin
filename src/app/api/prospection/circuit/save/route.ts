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

    // Phase 1: look up all existing prospects in parallel (was sequential N).
    const lookups = await Promise.all(
      restaurants.map((r) => prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Prospect"
        WHERE LOWER(name) = LOWER(${r.name}) AND LOWER(COALESCE(city, '')) = LOWER(${r.city ?? searchCity ?? ''})
        LIMIT 1
      `),
    );

    // Phase 2: build one write per restaurant and execute as a single transaction
    // round-trip (was 2N sequential round-trips end-to-end).
    let saved = 0;
    let skipped = 0;
    const writes = restaurants.map((r, i) => {
      const existing = lookups[i];
      if (existing.length > 0) {
        skipped++;
        return prisma.$executeRawUnsafe(
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
          existing[0].id,
        );
      }
      saved++;
      return prisma.$executeRawUnsafe(
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
    });
    if (writes.length > 0) {
      await prisma.$transaction(writes);
    }

    return NextResponse.json({ ok: true, saved, skipped });
  } catch (err: any) {
    console.error("[circuit/save]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
