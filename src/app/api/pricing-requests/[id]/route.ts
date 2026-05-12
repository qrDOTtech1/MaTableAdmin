/**
 * /api/pricing-requests/[id]
 *   PATCH  → met à jour le statut (CONTACTED / CONVERTED / REJECTED)
 *   DELETE → supprime la demande
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const patch: any = {};
  if (body.status !== undefined) patch.status = body.status;
  if (body.convertedRestaurantId !== undefined) {
    patch.convertedRestaurantId = body.convertedRestaurantId;
    patch.status = "CONVERTED";
    patch.convertedAt = new Date();
  }

  const updated = await (prisma as any).pricingRequest.update({ where: { id }, data: patch });
  return NextResponse.json({ ok: true, request: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await (prisma as any).pricingRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
