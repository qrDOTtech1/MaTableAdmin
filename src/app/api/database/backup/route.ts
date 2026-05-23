/**
 * POST /api/database/backup
 *   ?download=1  → renvoie le fichier .json.gz en téléchargement
 *   ?email=1     → envoie au destinataire configuré (AdminConfig.backupRecipient)
 *   (les deux)   → fait les deux
 *
 * Met à jour AdminConfig.lastBackupAt + métadonnées.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildBackup, emailBackup } from "@/lib/db-backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const wantDownload = searchParams.get("download") === "1";
  const wantEmail = searchParams.get("email") === "1";

  const result = await buildBackup();
  if (!result.ok || !result.buffer) {
    return NextResponse.json({ ok: false, reason: result.reason ?? "build_failed" }, { status: 500 });
  }

  // Persiste les métadonnées du backup
  await (prisma as any).adminConfig.upsert({
    where: { id: "default" },
    update: {
      lastBackupAt: new Date(),
      lastBackupSize: result.sizeBytes,
      lastBackupTables: result.tableCount,
      lastBackupRows: result.rowCount,
    },
    create: {
      id: "default",
      lastBackupAt: new Date(),
      lastBackupSize: result.sizeBytes,
      lastBackupTables: result.tableCount,
      lastBackupRows: result.rowCount,
    },
  });

  // Envoi email si demandé
  let emailResult: { ok: boolean; reason?: string } | null = null;
  if (wantEmail) {
    const cfg = await (prisma as any).adminConfig.findUnique({ where: { id: "default" } });
    const to = cfg?.backupRecipient;
    if (!to) {
      emailResult = { ok: false, reason: "no_recipient" };
    } else {
      emailResult = await emailBackup(to, result);
    }
  }

  // Téléchargement direct si demandé
  if (wantDownload) {
    return new NextResponse(result.buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.sizeBytes ?? 0),
        "X-Backup-Tables": String(result.tableCount ?? 0),
        "X-Backup-Rows": String(result.rowCount ?? 0),
        "X-Email-Sent": emailResult?.ok ? "true" : "false",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    sizeBytes: result.sizeBytes,
    tableCount: result.tableCount,
    rowCount: result.rowCount,
    filename: result.filename,
    email: emailResult,
  });
}
