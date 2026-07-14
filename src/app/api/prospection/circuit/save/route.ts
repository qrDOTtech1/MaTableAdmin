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

    // Prime existing-prospect lookup in a single SELECT so we don't do 2 round-trips per row.
    // A scraper batch of 100 restaurants was previously 100–200 sequential queries;
    // now it's at most 3 (SELECT + one INSERT batch + one UPDATE batch).
    const keyOf = (name: string, city: string | null | undefined) =>
      `${name.trim().toLowerCase()}|${(city ?? "").trim().toLowerCase()}`;
    const cityFor = (r: (typeof restaurants)[number]) => r.city ?? searchCity ?? "";

    const uniqueNames = Array.from(new Set(restaurants.map((r) => r.name.trim().toLowerCase())));
    const existingRows = uniqueNames.length
      ? await prisma.$queryRaw<Array<{ id: string; name: string; city: string | null }>>`
          SELECT id, name, city FROM "Prospect"
          WHERE LOWER(name) = ANY(${uniqueNames}::text[])
        `
      : [];
    const existingByKey = new Map<string, string>();
    for (const row of existingRows) {
      existingByKey.set(keyOf(row.name, row.city), row.id);
    }

    const toInsert: typeof restaurants = [];
    const toUpdate: Array<{ id: string; r: (typeof restaurants)[number] }> = [];
    for (const r of restaurants) {
      const id = existingByKey.get(keyOf(r.name, cityFor(r)));
      if (id) toUpdate.push({ id, r });
      else toInsert.push(r);
    }

    let saved = 0;
    let skipped = toUpdate.length;

    // Bulk INSERT (one round-trip for all new rows)
    if (toInsert.length > 0) {
      const cols = 12; // name, city, address, phone, website, description, category, imageUrl, sourceUrl, lat, lng, score
      const values: unknown[] = [];
      const placeholders: string[] = [];
      toInsert.forEach((r, i) => {
        const b = i * cols;
        placeholders.push(
          `(gen_random_uuid(), $${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, NULL, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, 'NEW', $${b + 10}, $${b + 11}, 'circuit', $${b + 12}, NOW(), NOW())`,
        );
        values.push(
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
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Prospect"
           (id, name, city, address, phone, email, website, description, category, "imageUrl", "sourceUrl", status, "lat", "lng", source, score, "createdAt", "updatedAt")
         VALUES ${placeholders.join(", ")}`,
        ...values,
      );
      saved = toInsert.length;
    }

    // Bulk UPDATE via a single UPDATE ... FROM (VALUES ...) — one round-trip for all matches.
    if (toUpdate.length > 0) {
      const cols = 6; // id, lat, lng, phone, website, imageUrl
      const values: unknown[] = [];
      const placeholders: string[] = [];
      toUpdate.forEach(({ id, r }, i) => {
        const b = i * cols;
        placeholders.push(
          `($${b + 1}::text, $${b + 2}::float8, $${b + 3}::float8, $${b + 4}::text, $${b + 5}::text, $${b + 6}::text)`,
        );
        values.push(
          id,
          r.lat ?? null,
          r.lng ?? null,
          r.phone ?? null,
          r.website ?? null,
          r.photo_url ?? null,
        );
      });
      await prisma.$executeRawUnsafe(
        `UPDATE "Prospect" p SET
           "lat" = COALESCE(p."lat", v.lat),
           "lng" = COALESCE(p."lng", v.lng),
           "phone" = COALESCE(p."phone", v.phone),
           "website" = COALESCE(p."website", v.website),
           "imageUrl" = COALESCE(p."imageUrl", v."imageUrl"),
           "source" = COALESCE(p."source", 'circuit'),
           "updatedAt" = NOW()
         FROM (VALUES ${placeholders.join(", ")})
           AS v(id, lat, lng, phone, website, "imageUrl")
         WHERE p.id = v.id`,
        ...values,
      );
    }

    return NextResponse.json({ ok: true, saved, skipped });
  } catch (err: any) {
    console.error("[circuit/save]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
