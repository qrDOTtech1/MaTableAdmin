/**
 * /api/admin/charges/[id] — DELETE supprime la charge
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.$executeRawUnsafe(`DELETE FROM "SupplierInvoice" WHERE id = $1`, id);
  return NextResponse.json({ ok: true });
}
