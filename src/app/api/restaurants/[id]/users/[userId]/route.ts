import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

function generatePassword(length = 12): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join("");
}

type Params = { params: Promise<{ id: string; userId: string }> };

// PATCH — change email OR reset password
// { email? }  → update email
// { resetPassword: true }  → generate new password, return it
// { resetPassword: true, sendEmail: true }  → generate + send by email
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  const body = await req.json();

  const user = await prisma.user.findFirst({ where: { id: userId, restaurantId: id } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Change email
  if (body.email) {
    const existing = await prisma.user.findFirst({ where: { email: body.email.trim(), NOT: { id: userId } } });
    if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });
    await prisma.user.update({ where: { id: userId }, data: { email: body.email.trim() } });
    return NextResponse.json({ ok: true, email: body.email.trim() });
  }

  // Reset password
  if (body.resetPassword) {
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Optionally send email
    if (body.sendEmail) {
      try {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const resend = new Resend(resendKey);
          const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { name: true, slug: true } });
          await resend.emails.send({
            from: "admin@matable.pro",
            to: user.email,
            subject: "🔑 Vos nouveaux identifiants MaTable",
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
                <h2 style="color:#f97316;margin-bottom:8px">🍽️ MaTable</h2>
                <h3 style="color:#fff;margin-bottom:24px">Vos nouveaux identifiants de connexion</h3>
                <p style="color:#94a3b8;margin-bottom:24px">Bonjour,<br>Voici vos nouveaux identifiants pour accéder à votre tableau de bord MaTable.</p>
                <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin-bottom:24px">
                  <p style="margin:0 0 8px;color:#94a3b8;font-size:13px">Email</p>
                  <p style="margin:0 0 16px;color:#fff;font-family:monospace;font-size:15px">${user.email}</p>
                  <p style="margin:0 0 8px;color:#94a3b8;font-size:13px">Mot de passe temporaire</p>
                  <p style="margin:0;color:#f97316;font-family:monospace;font-size:18px;font-weight:bold">${password}</p>
                </div>
                ${restaurant ? `<a href="https://matable.pro/${restaurant.slug}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Accéder à mon tableau de bord →</a>` : ""}
                <p style="color:#475569;font-size:12px;margin-top:24px">Nous vous recommandons de changer ce mot de passe dès votre première connexion.</p>
              </div>
            `,
          });
        }
      } catch (e) {
        console.error("[send reset email]", e);
        // Don't fail if email sending fails — still return password
      }
    }

    return NextResponse.json({ ok: true, password, emailSent: !!body.sendEmail });
  }

  return NextResponse.json({ error: "nothing_to_do" }, { status: 400 });
}

// DELETE — remove user from restaurant
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  const user = await prisma.user.findFirst({ where: { id: userId, restaurantId: id } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
