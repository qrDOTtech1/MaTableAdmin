/**
 * /api/database/migrate
 *
 * Applique toutes les migrations SQL non-destructives (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Idempotent — peut être appelé plusieurs fois sans risque.
 *
 * Auth : session admin OU User-Agent cron (railway-cron, vercel-cron, etc.)
 *
 * Ce endpoint est automatiquement appelé par le cron daily-backup.
 * Il peut aussi être déclenché manuellement depuis le dashboard Base de Données.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CRON_UAS = [
  "railway-cron", "vercel-cron", "cron-job.org", "easycron", "github-actions",
];

function isAuthorized(req: NextRequest, session: any): boolean {
  if (session) return true;
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  return CRON_UAS.some(a => ua.includes(a));
}

// ── Migrations déclarées ici — IF NOT EXISTS = idempotentes ──────────────────
const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: "add_reservable_to_table",
    sql: `ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "reservable" BOOLEAN NOT NULL DEFAULT true`,
  },
  {
    name: "create_zone_config",
    sql: `CREATE TABLE IF NOT EXISTS "ZoneConfig" (
      "id"            TEXT NOT NULL,
      "restaurantId"  TEXT NOT NULL,
      "zone"          TEXT NOT NULL,
      "minFreeWalkIn" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "ZoneConfig_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ZoneConfig_restaurantId_fkey"
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
      CONSTRAINT "ZoneConfig_restaurantId_zone_key"
        UNIQUE ("restaurantId", "zone")
    )`,
  },
  {
    name: "create_zone_config_idx",
    sql: `CREATE INDEX IF NOT EXISTS "ZoneConfig_restaurantId_idx" ON "ZoneConfig"("restaurantId")`,
  },
];

export async function runMigrations(): Promise<{ applied: string[]; errors: Record<string, string> }> {
  const applied: string[] = [];
  const errors: Record<string, string> = {};

  for (const m of MIGRATIONS) {
    try {
      await prisma.$executeRawUnsafe(m.sql);
      applied.push(m.name);
    } catch (e: any) {
      errors[m.name] = e?.message ?? "unknown_error";
    }
  }

  return { applied, errors };
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!isAuthorized(req, session)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runMigrations();
  const hasErrors = Object.keys(result.errors).length > 0;

  return NextResponse.json({
    ok: !hasErrors,
    applied: result.applied,
    errors: result.errors,
    at: new Date().toISOString(),
  }, { status: hasErrors ? 207 : 200 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
