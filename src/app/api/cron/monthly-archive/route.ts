/**
 * /api/cron/monthly-archive
 *
 * Envoie par email un récapitulatif HTML de tous les documents générés
 * le mois écoulé, à l'adresse configurée dans AdminConfig.
 *
 * Auth :
 *   - GET : autorisé si User-Agent contient un mot-clé "cron" reconnu
 *           (railway-cron, vercel-cron, cron-job.org, easycron, github-actions)
 *           OU si session admin. Pas de variable d'env à créer.
 *   - POST : session admin obligatoire (bouton "Envoyer maintenant").
 *
 * Mise en place du déclenchement automatique (au choix) :
 *   1. cron-job.org (gratuit, 1 min à configurer) → créer un job mensuel
 *      qui ping GET https://<votre-domaine>/api/cron/monthly-archive
 *   2. Railway : créer un service séparé "monthly-archive-cron" avec
 *      cronSchedule "0 9 1 * *" et startCommand
 *      `curl -fsSL https://<votre-domaine>/api/cron/monthly-archive
 *       -H "User-Agent: railway-cron"`
 *   3. GitHub Actions : .github/workflows/monthly-archive.yml avec
 *      schedule cron + curl
 *
 * Sinon : utiliser le bouton "Envoyer maintenant" depuis /dashboard/documents
 * une fois par mois.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_CRON_AGENTS = [
  "railway-cron",
  "vercel-cron",
  "cron-job.org",
  "easycron",
  "github-actions",
];

function isAuthorized(req: NextRequest, session: any): boolean {
  if (session) return true;
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  return ALLOWED_CRON_AGENTS.some((agent) => ua.includes(agent));
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthBounds(now = new Date()) {
  // 1er du mois courant 00:00 = fin (exclu)
  const end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  // 1er du mois précédent 00:00 = début
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  return { start, end, key: monthKey(start) };
}

function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

async function runArchive(opts: { dryRun?: boolean; force?: boolean } = {}) {
  const cfg = await prisma.adminConfig.findUnique({ where: { id: "default" } });
  if (!cfg || !cfg.archiveEnabled || !cfg.archiveRecipient) {
    return { ok: false, reason: "archive_disabled_or_no_recipient" };
  }

  const { start, end, key } = previousMonthBounds();

  const docs = await prisma.generatedDocument.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      ...(opts.force ? {} : { archivedInMonth: null }),
    },
    include: { restaurant: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (docs.length === 0) {
    return { ok: true, sent: false, reason: "no_documents", period: key };
  }

  // Récap par type
  const byType: Record<string, { count: number; total: number }> = {};
  let grandTotal = 0;
  for (const d of docs) {
    byType[d.type] ??= { count: 0, total: 0 };
    byType[d.type].count++;
    byType[d.type].total += d.totalCents;
    grandTotal += d.totalCents;
  }

  const typeLabels: Record<string, string> = {
    contrat: "Contrats d'abonnement",
    prestation: "Contrats de prestation",
    devis: "Devis",
    facture: "Factures",
    cgvu: "CGV / CGU",
    onboarding: "Fiches Onboarding",
    tarification: "Fiches Tarification",
  };

  const html = `<!doctype html>
<html><body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 24px;">
  <div style="border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 24px;">MaTable<span style="color:#f97316">.Pro</span> — Archive mensuelle</h1>
    <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
      Période : <b>${start.toLocaleDateString("fr-FR")}</b> → <b>${new Date(end.getTime() - 1).toLocaleDateString("fr-FR")}</b>
    </p>
  </div>

  <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 2px; color: #f97316; border-top: 1px solid #eee; padding-top: 16px;">Résumé</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="background: #000; color: #fff;">
        <th style="padding: 10px; text-align: left;">Type</th>
        <th style="padding: 10px; text-align: right;">Nombre</th>
        <th style="padding: 10px; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(byType).map(([t, v]) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px;">${typeLabels[t] ?? t}</td>
          <td style="padding: 10px; text-align: right;">${v.count}</td>
          <td style="padding: 10px; text-align: right;">${v.total > 0 ? euros(v.total) : "—"}</td>
        </tr>
      `).join("")}
      <tr style="background: #fafafa; font-weight: 900;">
        <td style="padding: 10px;">TOTAL</td>
        <td style="padding: 10px; text-align: right;">${docs.length}</td>
        <td style="padding: 10px; text-align: right; color: #f97316;">${euros(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 2px; color: #f97316; border-top: 1px solid #eee; padding-top: 16px;">Détail (${docs.length})</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background: #f5f5f5;">
        <th style="padding: 8px; text-align: left;">N°</th>
        <th style="padding: 8px; text-align: left;">Type</th>
        <th style="padding: 8px; text-align: left;">Client</th>
        <th style="padding: 8px; text-align: right;">Montant HT</th>
        <th style="padding: 8px; text-align: left;">Date</th>
      </tr>
    </thead>
    <tbody>
      ${docs.map((d) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px;"><b>${d.number}</b></td>
          <td style="padding: 8px;">${typeLabels[d.type] ?? d.type}</td>
          <td style="padding: 8px;">${d.restaurant?.name ?? "—"}</td>
          <td style="padding: 8px; text-align: right;">${d.totalCents > 0 ? euros(d.totalCents) : "—"}</td>
          <td style="padding: 8px;">${d.createdAt.toLocaleDateString("fr-FR")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <p style="color: #999; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
    Email automatique généré par MaTable Admin. Pour modifier le destinataire ou désactiver
    l'envoi mensuel, rendez-vous dans <b>Configuration</b>.
  </p>
</body></html>`;

  if (opts.dryRun) {
    return { ok: true, sent: false, reason: "dry_run", documents: docs.length, period: key, preview: html };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, reason: "no_resend_key" };

  const resend = new Resend(resendKey);
  const result = await resend.emails.send({
    from: "archive@matable.pro",
    to: [cfg.archiveRecipient],
    subject: `MaTable.Pro — Archive ${key} (${docs.length} document${docs.length > 1 ? "s" : ""})`,
    html,
  });

  if (result.error) {
    console.error("[monthly-archive] resend error", result.error);
    return { ok: false, reason: "resend_error", error: result.error };
  }

  // Marquer les docs comme archivés + update lastArchiveSentAt
  await prisma.$transaction([
    prisma.generatedDocument.updateMany({
      where: { id: { in: docs.map((d) => d.id) } },
      data: { archivedInMonth: key },
    }),
    prisma.adminConfig.update({
      where: { id: "default" },
      data: { lastArchiveSentAt: new Date() },
    }),
  ]);

  return { ok: true, sent: true, documents: docs.length, period: key, recipient: cfg.archiveRecipient };
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!isAuthorized(req, session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runArchive();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const force = url.searchParams.get("force") === "1";
  const result = await runArchive({ dryRun, force });
  return NextResponse.json(result);
}
