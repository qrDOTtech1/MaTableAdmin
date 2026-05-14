import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

async function ensureColumns() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "GlobalConfig" ADD COLUMN IF NOT EXISTS "vapiApiKey" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "GlobalConfig" ADD COLUMN IF NOT EXISTS "vapiPhoneNumberId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "GlobalConfig" ADD COLUMN IF NOT EXISTS "vapiAssistantId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "GlobalConfig" ADD COLUMN IF NOT EXISTS "elevenLabsVoiceId" TEXT`);
  await prisma.$executeRawUnsafe(`INSERT INTO "GlobalConfig" (id) VALUES ('global') ON CONFLICT (id) DO NOTHING`);
}

export async function GET() {
  try {
    await ensureColumns();
    const rows = await prisma.$queryRaw<Array<{
      vapiApiKey: string | null;
      vapiPhoneNumberId: string | null;
      vapiAssistantId: string | null;
      elevenLabsVoiceId: string | null;
    }>>`
      SELECT "vapiApiKey", "vapiPhoneNumberId", "vapiAssistantId", "elevenLabsVoiceId"
      FROM "GlobalConfig" WHERE id = 'global' LIMIT 1
    `;
    const r = rows[0] ?? {};
    return NextResponse.json({
      vapiApiKey: r.vapiApiKey ?? null,
      vapiPhoneNumberId: r.vapiPhoneNumberId ?? null,
      vapiAssistantId: r.vapiAssistantId ?? null,
      elevenLabsVoiceId: r.elevenLabsVoiceId ?? null,
      hasVapi: !!r.vapiApiKey,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureColumns();
    const { vapiApiKey, vapiPhoneNumberId, vapiAssistantId, elevenLabsVoiceId } = await req.json();
    await prisma.$executeRawUnsafe(
      `UPDATE "GlobalConfig" SET
        "vapiApiKey" = COALESCE($1, "vapiApiKey"),
        "vapiPhoneNumberId" = COALESCE($2, "vapiPhoneNumberId"),
        "vapiAssistantId" = COALESCE($3, "vapiAssistantId"),
        "elevenLabsVoiceId" = COALESCE($4, "elevenLabsVoiceId"),
        "updatedAt" = NOW()
      WHERE id = 'global'`,
      vapiApiKey ?? null,
      vapiPhoneNumberId ?? null,
      vapiAssistantId ?? null,
      elevenLabsVoiceId ?? null,
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
