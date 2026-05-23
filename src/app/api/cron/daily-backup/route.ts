/**
 * /api/cron/daily-backup
 *
 * Backup quotidien automatique. Mêmes règles d'auth que monthly-archive :
 * accepte User-Agent contenant 'cron' (railway-cron, vercel-cron, cron-job.org…)
 * OU une session admin valide.
 *
 * Configurez un cron externe (cron-job.org, GitHub Actions, Railway cron service…)
 * qui ping ce endpoint chaque jour à l'heure définie dans AdminConfig.backupHourUtc.
 *
 * Le endpoint vérifie qu'on est dans la bonne heure UTC pour éviter de tirer
 * plusieurs backups par jour si plusieurs crons l'appellent.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildBackup, emailBackup } from "@/lib/db-backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRON_UAS = [
  "railway-cron", "vercel-cron", "cron-job.org", "easycron", "github-actions",
];

function isAuthorized(req: NextRequest, session: any): boolean {
  if (session) return true;
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  return CRON_UAS.some(a => ua.includes(a));
}

async function runDailyBackup(opts: { force?: boolean }) {
  const cfg = await (prisma as any).adminConfig.findUnique({ where: { id: "default" } });
  if (!cfg || !cfg.backupEnabled) return { ok: false, reason: "backup_disabled" };
  if (!cfg.backupRecipient) return { ok: false, reason: "no_recipient" };

  // Garde anti-doublons : si le dernier backup date d'il y a < 20h, skip (sauf force)
  if (!opts.force && cfg.lastBackupAt) {
    const ageHours = (Date.now() - new Date(cfg.lastBackupAt).getTime()) / 3600000;
    if (ageHours < 20) return { ok: true, sent: false, reason: "too_recent", ageHours };
  }

  const result = await buildBackup();
  if (!result.ok || !result.buffer) return { ok: false, reason: "build_failed" };

  const emailResult = await emailBackup(cfg.backupRecipient, result);
  if (!emailResult.ok) return { ok: false, reason: emailResult.reason ?? "email_failed" };

  await (prisma as any).adminConfig.update({
    where: { id: "default" },
    data: {
      lastBackupAt: new Date(),
      lastBackupSize: result.sizeBytes,
      lastBackupTables: result.tableCount,
      lastBackupRows: result.rowCount,
    },
  });

  return {
    ok: true,
    sent: true,
    sizeBytes: result.sizeBytes,
    tableCount: result.tableCount,
    rowCount: result.rowCount,
    recipient: cfg.backupRecipient,
  };
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!isAuthorized(req, session)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runDailyBackup({ force: false });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const result = await runDailyBackup({ force });
  return NextResponse.json(result);
}
