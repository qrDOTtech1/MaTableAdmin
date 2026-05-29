/**
 * /api/admin/campaigns/send
 *
 * Envoie un email à un segment de restaurateurs.
 * - Calcule le segment (essai actif, expiré, inactif, sans menu, etc.)
 * - Envoie via Resend (séquentiel léger pour éviter le rate-limit)
 * - Journalise dans CampaignLog
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Recipient = { id: string; name: string; email: string };

async function computeSegment(segment: string): Promise<Recipient[]> {
  const now = new Date();
  switch (segment) {
    case "all":
      return prisma.$queryRawUnsafe<Recipient[]>(
        `SELECT r.id, r.name, u.email
           FROM "Restaurant" r
           JOIN "User" u ON u."restaurantId" = r.id
          WHERE u.email IS NOT NULL`
      );
    case "trial_active":
      return prisma.$queryRawUnsafe<Recipient[]>(
        `SELECT r.id, r.name, u.email
           FROM "Restaurant" r
           JOIN "User" u ON u."restaurantId" = r.id
          WHERE u.email IS NOT NULL
            AND COALESCE(r."platformStripeSubscriptionId",'') = ''
            AND NOT EXISTS (SELECT 1 FROM "SubscriptionEvent" se WHERE se."restaurantId" = r.id AND se."amountCents" > 0)
            AND r."subscriptionExpiresAt" > $1`,
        now,
      );
    case "trial_expired":
      return prisma.$queryRawUnsafe<Recipient[]>(
        `SELECT r.id, r.name, u.email
           FROM "Restaurant" r
           JOIN "User" u ON u."restaurantId" = r.id
          WHERE u.email IS NOT NULL
            AND COALESCE(r."platformStripeSubscriptionId",'') = ''
            AND NOT EXISTS (SELECT 1 FROM "SubscriptionEvent" se WHERE se."restaurantId" = r.id AND se."amountCents" > 0)
            AND (r."subscriptionExpiresAt" IS NULL OR r."subscriptionExpiresAt" < $1)`,
        now,
      );
    case "converted":
      return prisma.$queryRawUnsafe<Recipient[]>(
        `SELECT DISTINCT r.id, r.name, u.email
           FROM "Restaurant" r
           JOIN "User" u ON u."restaurantId" = r.id
           JOIN "SubscriptionEvent" se ON se."restaurantId" = r.id
          WHERE u.email IS NOT NULL AND se."amountCents" > 0`
      );
    case "inactive_14d":
      return prisma.$queryRawUnsafe<Recipient[]>(
        `SELECT r.id, r.name, u.email
           FROM "Restaurant" r
           JOIN "User" u ON u."restaurantId" = r.id
          WHERE u.email IS NOT NULL
            AND r."updatedAt" < ($1::timestamp - INTERVAL '14 days')`,
        now,
      );
    case "no_menu":
      return prisma.$queryRawUnsafe<Recipient[]>(
        `SELECT r.id, r.name, u.email
           FROM "Restaurant" r
           JOIN "User" u ON u."restaurantId" = r.id
          WHERE u.email IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM "MenuItem" m WHERE m."restaurantId" = r.id)`
      );
    default:
      return [];
  }
}

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { segment, subject, body, from, dryRun } = await req.json();
  if (!segment || !subject || !body) {
    return NextResponse.json({ error: "segment, subject, body requis" }, { status: 400 });
  }
  const fromEmail = (from || "contact").includes("@") ? from : `${from || "contact"}@matable.pro`;
  if (!fromEmail.endsWith("@matable.pro")) {
    return NextResponse.json({ error: "L'adresse d'envoi doit etre @matable.pro" }, { status: 400 });
  }

  const recipients = await computeSegment(String(segment));

  // Mode preview : on ne fait que compter, on n'envoie rien
  if (dryRun) {
    return NextResponse.json({ ok: true, count: recipients.length, dryRun: true });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY non configure" }, { status: 503 });
  const resend = new Resend(key);

  let sentCount = 0;
  let failCount = 0;
  for (const r of recipients) {
    try {
      const personalSubject = render(String(subject), { name: r.name });
      const personalBody = render(String(body), { name: r.name });
      // Body est traité comme HTML simple (les sauts de ligne → <br>)
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.6">${personalBody.replace(/\n/g, "<br/>")}</div>`;
      await resend.emails.send({
        from: fromEmail,
        to: [r.email],
        subject: personalSubject,
        html,
      });
      sentCount++;
      // Petit délai pour rester sous les limites Resend (~10/s)
      await new Promise((ok) => setTimeout(ok, 120));
    } catch (e) {
      failCount++;
      console.warn("[campaign] send fail", r.email, (e as Error).message?.split("\n")[0]);
    }
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CampaignLog" ("id","segment","subject","body","sentCount","failCount") VALUES ($1,$2,$3,$4,$5,$6)`,
      `camp_${crypto.randomBytes(10).toString("hex")}`,
      String(segment), String(subject), String(body), sentCount, failCount,
    );
  } catch (e) {
    console.warn("[campaign] log insert skipped:", (e as Error).message?.split("\n")[0]);
  }

  return NextResponse.json({ ok: true, sentCount, failCount, total: recipients.length });
}
