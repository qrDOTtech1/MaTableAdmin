import { prisma } from "@/lib/db";
import DatabaseClient from "./DatabaseClient";

export const dynamic = "force-dynamic";

export default async function DatabasePage() {
  let cfg: any = null;
  try {
    cfg = await (prisma as any).adminConfig.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
  } catch (e: any) {
    if (e?.code === "P2021") {
      return (
        <div className="p-6 max-w-2xl">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-200">
            <h1 className="text-xl font-bold mb-2">⚠ Migration DB en attente</h1>
            <p className="text-sm">
              Appliquer <code className="text-amber-400">prisma/migrations/add_backup_fields.sql</code> sur la base.
            </p>
          </div>
        </div>
      );
    }
    throw e;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🗄 Base de données</h1>
        <p className="text-slate-400 text-sm mt-1">
          Backups quotidiens, surveillance des tables, persistance des données client.
        </p>
      </div>
      <DatabaseClient
        initialConfig={{
          backupRecipient: cfg.backupRecipient ?? "",
          backupEnabled: cfg.backupEnabled ?? false,
          backupHourUtc: cfg.backupHourUtc ?? 3,
          lastBackupAt: cfg.lastBackupAt?.toISOString() ?? null,
          lastBackupSize: cfg.lastBackupSize ?? null,
          lastBackupTables: cfg.lastBackupTables ?? null,
          lastBackupRows: cfg.lastBackupRows ?? null,
        }}
      />
    </div>
  );
}
