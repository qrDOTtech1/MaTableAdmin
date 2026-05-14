import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

async function ensureColumn() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "GlobalConfig" ADD COLUMN IF NOT EXISTS "perplexityApiKey" TEXT`);
  await prisma.$executeRawUnsafe(`INSERT INTO "GlobalConfig" (id) VALUES ('global') ON CONFLICT (id) DO NOTHING`);
}

export async function GET() {
  try {
    await ensureColumn();
    const rows = await prisma.$queryRaw<Array<{ perplexityApiKey: string | null; updatedAt: Date }>>`
      SELECT "perplexityApiKey", "updatedAt" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `;
    const key = rows[0]?.perplexityApiKey ?? null;
    return NextResponse.json({ hasKey: !!key, key: key ?? null, updatedAt: rows[0]?.updatedAt ?? null });
  } catch (err: any) {
    return NextResponse.json({ hasKey: false, key: null });
  }
}

export async function POST(req: Request) {
  try {
    await ensureColumn();
    const { key } = await req.json();
    const trimmed = (key as string)?.trim() || null;
    await prisma.$executeRawUnsafe(
      `UPDATE "GlobalConfig" SET "perplexityApiKey" = $1, "updatedAt" = NOW() WHERE id = 'global'`,
      trimmed
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
