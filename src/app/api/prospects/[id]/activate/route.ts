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

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// POST /api/prospects/:id/activate  { email, plan? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { email, plan = "STARTER" } = await req.json();

  if (!email) return NextResponse.json({ error: "email_required" }, { status: 400 });

  const prospect = await (prisma as any).prospect.findUnique({ where: { id } });
  if (!prospect) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (prospect.status === "ACTIVATED") {
    return NextResponse.json({ error: "already_activated" }, { status: 409 });
  }

  // Check email not already taken
  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // Generate unique slug
  let baseSlug = slugify(prospect.name || "restaurant");
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Create restaurant + user in one transaction
  const restaurant = await prisma.restaurant.create({
    data: {
      name: prospect.name,
      slug,
      city: prospect.city ?? undefined,
      address: prospect.address ?? undefined,
      phone: prospect.phone ?? undefined,
      email: email,
      website: prospect.website ?? undefined,
      description: prospect.description ?? undefined,
      subscription: plan as any,
      users: {
        create: {
          email,
          passwordHash,
        },
      },
    },
    include: { users: { take: 1, select: { id: true, email: true } } },
  });

  // Mark prospect as activated
  await (prisma as any).prospect.update({
    where: { id },
    data: {
      status: "ACTIVATED",
      restaurantId: restaurant.id,
      activatedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    credentials: { email, password, loginUrl: `https://matable.pro/${slug}` },
  });
}
