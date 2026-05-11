/**
 * /api/admin-config
 *   GET  → retourne la config singleton (la crée vide si absente)
 *   POST → met à jour (archiveRecipient, archiveEnabled, archiveDayOfMonth)
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function ensureConfig() {
  return prisma.adminConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfg = await ensureConfig();
  return NextResponse.json({ config: cfg });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const patch: any = {};
  if (body.archiveRecipient !== undefined) patch.archiveRecipient = body.archiveRecipient || null;
  if (body.archiveEnabled !== undefined) patch.archiveEnabled = !!body.archiveEnabled;
  if (body.archiveDayOfMonth !== undefined) {
    const d = Number(body.archiveDayOfMonth);
    patch.archiveDayOfMonth = isNaN(d) ? 1 : Math.min(Math.max(d, 1), 28);
  }

  const cfg = await prisma.adminConfig.upsert({
    where: { id: "default" },
    update: patch,
    create: { id: "default", ...patch },
  });
  return NextResponse.json({ ok: true, config: cfg });
}
