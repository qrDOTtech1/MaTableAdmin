/**
 * GET / POST /api/database/config
 * Lecture / écriture de la config backup (sous-section d'AdminConfig).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cfg = await (prisma as any).adminConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return NextResponse.json({ config: cfg });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const patch: any = {};
  if (body.backupRecipient !== undefined) patch.backupRecipient = body.backupRecipient || null;
  if (body.backupEnabled !== undefined) patch.backupEnabled = !!body.backupEnabled;
  if (body.backupHourUtc !== undefined) {
    const h = Number(body.backupHourUtc);
    patch.backupHourUtc = isNaN(h) ? 3 : Math.max(0, Math.min(23, h));
  }

  const cfg = await (prisma as any).adminConfig.upsert({
    where: { id: "default" },
    update: patch,
    create: { id: "default", ...patch },
  });
  return NextResponse.json({ ok: true, config: cfg });
}
