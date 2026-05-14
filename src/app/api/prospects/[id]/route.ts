import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/prospects/:id — { status?, notes?, score?, name?, phone?, email?, address?, website?, category?, description? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, notes, score, name, phone, email, address, website, category, description } = body;

  // Ensure extra columns exist
  await prisma.$executeRawUnsafe(`ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "score" TEXT`).catch(() => {});

  const data: Record<string, any> = { updatedAt: new Date() };
  if (status) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (score !== undefined) data.score = score;
  if (name) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;
  if (address !== undefined) data.address = address;
  if (website !== undefined) data.website = website;
  if (category !== undefined) data.category = category;
  if (description !== undefined) data.description = description;

  const updated = await (prisma as any).prospect.update({ where: { id }, data });
  return NextResponse.json({ prospect: updated });
}
