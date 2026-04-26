import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Ensure GlobalConfig table + row exist
async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GlobalConfig" (
      id TEXT NOT NULL DEFAULT 'global',
      "ollamaApiKey" TEXT,
      "ollamaLangModel" TEXT NOT NULL DEFAULT 'gpt-oss:120b',
      "ollamaVisionModel" TEXT NOT NULL DEFAULT 'qwen3-vl:235b',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY (id)
    )
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "GlobalConfig" (id, "ollamaApiKey", "ollamaLangModel", "ollamaVisionModel", "updatedAt")
    VALUES ('global', NULL, 'gpt-oss:120b', 'qwen3-vl:235b', NOW())
    ON CONFLICT (id) DO NOTHING
  `);
}

// GET — check if key is set
export async function GET() {
  try {
    await ensureTable();
    const rows = await prisma.$queryRaw<Array<{
      ollamaApiKey: string | null;
      updatedAt: Date;
    }>>`SELECT "ollamaApiKey", "updatedAt" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1`;
    const row = rows[0];
    return NextResponse.json({
      hasKey: !!row?.ollamaApiKey,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (err: any) {
    console.error("[ia-config GET]", err);
    return NextResponse.json({ hasKey: false, updatedAt: null });
  }
}

// POST — save API key
export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();
    const key = (body.ollamaApiKey as string)?.trim() || null;

    if (!key) {
      return NextResponse.json({ error: "Cle API requise" }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE "GlobalConfig"
      SET "ollamaApiKey" = ${key}, "updatedAt" = NOW()
      WHERE id = 'global'
    `;

    const rows = await prisma.$queryRaw<Array<{ updatedAt: Date }>>`
      SELECT "updatedAt" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `;

    return NextResponse.json({ ok: true, updatedAt: rows[0]?.updatedAt });
  } catch (err: any) {
    console.error("[ia-config POST]", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}

// DELETE — revoke key
export async function DELETE() {
  try {
    await ensureTable();
    await prisma.$executeRaw`
      UPDATE "GlobalConfig" SET "ollamaApiKey" = NULL, "updatedAt" = NOW() WHERE id = 'global'
    `;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[ia-config DELETE]", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}
