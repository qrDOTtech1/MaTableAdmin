import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generatePassword(length = 12): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join("");
}

// GET /api/restaurants/:id/users
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const users = await prisma.user.findMany({
    where: { restaurantId: id },
    select: { id: true, email: true, createdAt: true, passwordHash: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      hasPassword: !!u.passwordHash,
    })),
  });
}

// POST /api/restaurants/:id/users  { email }  — add a new user
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "email_required" }, { status: 400 });

  const existing = await prisma.user.findFirst({ where: { email: email.trim() } });
  if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email: email.trim(), passwordHash, restaurantId: id },
  });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email }, password });
}
