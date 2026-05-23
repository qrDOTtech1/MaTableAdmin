/**
 * Backup logique de la DB partagée — JSON gzipé envoyé par email.
 *
 * Pourquoi pas pg_dump ?
 *   - Pas de postgresql-client dans l'image Docker Railway de l'admin
 *   - Le JSON logique est restaurable via SQL/Prisma plus simplement
 *   - Lisible à l'œil, archivable, déduplicable
 *
 * Tables sauvegardées (les plus critiques, irrecupérables si perdues) :
 *   - Restaurant, MenuItem, User, Server, Table
 *   - CustomerReview (avis IA, vouchers)
 *   - Prospect, PricingRequest
 *   - GeneratedDocument, AdminConfig
 *   - Order (commandes payées des 90 derniers jours)
 *
 * Tables NON sauvegardées (volumineuses + reconstructibles) :
 *   - TableSession, Reservation, ServiceCall (logs opérationnels)
 *   - Photo, Media (binaires — trop gros pour email)
 */
import { prisma } from "@/lib/db";
import { gzipSync } from "node:zlib";

type BackupResult = {
  ok: boolean;
  reason?: string;
  buffer?: Buffer;       // dump JSON gzipé
  filename?: string;
  sizeBytes?: number;
  tableCount?: number;
  rowCount?: number;
};

const CRITICAL_TABLES = [
  "Restaurant", "MenuItem", "User", "Server", "Table",
  "CustomerReview", "Prospect", "PricingRequest",
  "GeneratedDocument", "AdminConfig", "GlobalConfig",
] as const;

export async function buildBackup(): Promise<BackupResult> {
  const dump: Record<string, any[]> = {};
  let totalRows = 0;
  let tableCount = 0;

  for (const table of CRITICAL_TABLES) {
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${table}"`);
      dump[table] = rows;
      totalRows += rows.length;
      tableCount++;
    } catch (e: any) {
      // Table absente ou inaccessible — on note l'erreur sans tout faire échouer
      dump[`__error_${table}`] = [{ error: e?.message ?? String(e) }];
    }
  }

  // Commandes payées récentes uniquement (90 jours) — sinon trop volumineux
  try {
    const recentOrders = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Order" WHERE "createdAt" > NOW() - INTERVAL '90 days'`
    );
    dump["Order_last90d"] = recentOrders;
    totalRows += recentOrders.length;
    tableCount++;
  } catch {}

  const meta = {
    generatedAt: new Date().toISOString(),
    tableCount,
    rowCount: totalRows,
    schemaVersion: "1.0",
  };

  const json = JSON.stringify({ __meta: meta, ...dump }, jsonReplacer, 2);
  const gz = gzipSync(Buffer.from(json, "utf8"));

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `matable-backup-${ts}.json.gz`;

  return {
    ok: true,
    buffer: gz,
    filename,
    sizeBytes: gz.byteLength,
    tableCount,
    rowCount: totalRows,
  };
}

/** Json serializer qui gère BigInt + Buffer + Date. */
function jsonReplacer(_key: string, value: any) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Buffer) return `__buffer:${value.length}b`;
  return value;
}

/** Envoie le backup par email via Resend. */
export async function emailBackup(
  to: string,
  result: BackupResult
): Promise<{ ok: boolean; reason?: string }> {
  if (!result.ok || !result.buffer) return { ok: false, reason: "no_buffer" };
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "no_resend_key" };

  const { Resend } = await import("resend");
  const resend = new Resend(key);

  const sizeMB = (result.sizeBytes! / 1024 / 1024).toFixed(2);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#f97316">MaTable.Pro — Backup DB quotidien</h2>
      <p>Backup logique de la base de production attaché à cet email.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
        <tr><td style="padding:6px;color:#666;">Date</td><td><b>${new Date().toLocaleString("fr-FR")}</b></td></tr>
        <tr><td style="padding:6px;color:#666;">Tables sauvegardées</td><td><b>${result.tableCount}</b></td></tr>
        <tr><td style="padding:6px;color:#666;">Lignes totales</td><td><b>${result.rowCount?.toLocaleString("fr-FR")}</b></td></tr>
        <tr><td style="padding:6px;color:#666;">Taille (gzip)</td><td><b>${sizeMB} MB</b></td></tr>
      </table>
      <p style="font-size:12px;color:#666;">
        Format : JSON gzipé. Restauration via script Node + Prisma (voir documentation interne).
        Conservez ces emails — Gmail/Outlook gardent les pièces jointes par défaut.
      </p>
    </div>
  `;

  const sent = await resend.emails.send({
    from: "backup@matable.pro",
    to: [to],
    subject: `MaTable.Pro — Backup ${new Date().toISOString().slice(0, 10)} (${sizeMB} MB, ${result.rowCount} lignes)`,
    html,
    attachments: [
      {
        filename: result.filename!,
        content: result.buffer.toString("base64"),
      },
    ],
  });

  if (sent.error) return { ok: false, reason: String(sent.error) };
  return { ok: true };
}
