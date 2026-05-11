/**
 * /api/documents/[id]
 *   GET    → détail
 *   PATCH  → met à jour (signedAt notamment)
 *   DELETE → supprime
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const doc = await prisma.generatedDocument.findUnique({
    where: { id },
    include: { restaurant: { select: { id: true, name: true, slug: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const patch: any = {};
  if (body.signedAt !== undefined) patch.signedAt = body.signedAt ? new Date(body.signedAt) : null;
  if (body.pdfUrl !== undefined) patch.pdfUrl = body.pdfUrl;
  if (body.title !== undefined) patch.title = body.title;

  const doc = await prisma.generatedDocument.update({ where: { id }, data: patch });
  return NextResponse.json({ ok: true, document: doc });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.generatedDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
