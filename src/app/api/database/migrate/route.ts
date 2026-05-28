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
    name: "add_zone_to_table",
    sql: `ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "zone" TEXT`,
  },
  {
    name: "add_reservable_to_table",
    sql: `ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "reservable" BOOLEAN NOT NULL DEFAULT true`,
  },
  {
    name: "add_assigned_server_to_table",
    sql: `ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "assignedServerId" TEXT`,
  },
  {
    name: "create_table_zone_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Table_restaurantId_zone_idx" ON "Table"("restaurantId", "zone")`,
  },
  {
    name: "add_opening_hour_service",
    sql: `ALTER TABLE "OpeningHour" ADD COLUMN IF NOT EXISTS "service" TEXT`,
  },
  {
    name: "add_restaurant_is_partner",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "isPartner" BOOLEAN NOT NULL DEFAULT false`,
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
  // ── Fidélisation ──────────────────────────────────────────────────────────
  {
    name: "create_loyalty_customer",
    sql: `CREATE TABLE IF NOT EXISTS "LoyaltyCustomer" (
      "id"           TEXT NOT NULL,
      "restaurantId" TEXT NOT NULL,
      "firstName"    TEXT,
      "lastName"     TEXT,
      "email"        TEXT,
      "phone"        TEXT,
      "points"       INTEGER NOT NULL DEFAULT 0,
      "tier"         TEXT NOT NULL DEFAULT 'bronze',
      "totalSpent"   DOUBLE PRECISION NOT NULL DEFAULT 0,
      "visitCount"   INTEGER NOT NULL DEFAULT 0,
      "birthDate"    TIMESTAMP(3),
      "notes"        TEXT,
      "source"       TEXT NOT NULL DEFAULT 'manual',
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoyaltyCustomer_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "LoyaltyCustomer_restaurantId_fkey"
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE
    )`,
  },
  {
    name: "create_loyalty_customer_email_idx",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyCustomer_restaurantId_email_key"
      ON "LoyaltyCustomer"("restaurantId","email") WHERE "email" IS NOT NULL`,
  },
  {
    name: "create_loyalty_customer_idx",
    sql: `CREATE INDEX IF NOT EXISTS "LoyaltyCustomer_restaurantId_idx" ON "LoyaltyCustomer"("restaurantId")`,
  },
  {
    name: "patch_loyalty_customer_columns",
    sql: `ALTER TABLE "LoyaltyCustomer"
      ADD COLUMN IF NOT EXISTS "firstName" TEXT,
      ADD COLUMN IF NOT EXISTS "lastName" TEXT,
      ADD COLUMN IF NOT EXISTS "email" TEXT,
      ADD COLUMN IF NOT EXISTS "phone" TEXT,
      ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'bronze',
      ADD COLUMN IF NOT EXISTS "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "visitCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "notes" TEXT,
      ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  },
  {
    name: "create_loyalty_offer",
    sql: `CREATE TABLE IF NOT EXISTS "LoyaltyOffer" (
      "id"           TEXT NOT NULL,
      "restaurantId" TEXT NOT NULL,
      "name"         TEXT NOT NULL,
      "description"  TEXT,
      "type"         TEXT NOT NULL DEFAULT 'discount_pct',
      "value"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      "pointsCost"   INTEGER NOT NULL DEFAULT 100,
      "minTier"      TEXT,
      "active"       BOOLEAN NOT NULL DEFAULT true,
      "expiresAt"    TIMESTAMP(3),
      "usageLimit"   INTEGER,
      "usageCount"   INTEGER NOT NULL DEFAULT 0,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoyaltyOffer_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "LoyaltyOffer_restaurantId_fkey"
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE
    )`,
  },
  {
    name: "create_loyalty_offer_idx",
    sql: `CREATE INDEX IF NOT EXISTS "LoyaltyOffer_restaurantId_idx" ON "LoyaltyOffer"("restaurantId")`,
  },
  {
    name: "patch_loyalty_offer_columns",
    sql: `ALTER TABLE "LoyaltyOffer"
      ADD COLUMN IF NOT EXISTS "description" TEXT,
      ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'discount_pct',
      ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "pointsCost" INTEGER NOT NULL DEFAULT 100,
      ADD COLUMN IF NOT EXISTS "minTier" TEXT,
      ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "usageLimit" INTEGER,
      ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  },
  {
    name: "create_loyalty_transaction",
    sql: `CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
      "id"          TEXT NOT NULL,
      "customerId"  TEXT NOT NULL,
      "offerId"     TEXT,
      "type"        TEXT NOT NULL,
      "points"      INTEGER NOT NULL,
      "description" TEXT,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "LoyaltyTransaction_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE
    )`,
  },
  {
    name: "create_loyalty_transaction_idx",
    sql: `CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_customerId_idx" ON "LoyaltyTransaction"("customerId")`,
  },
  // ── Alerte email réservation ──────────────────────────────────────────────
  {
    name: "add_reservation_alert_email",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "reservationAlertEmail" TEXT`,
  },
  {
    name: "add_reservation_alert_emails",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "reservationAlertEmails" JSONB NOT NULL DEFAULT '[]'::jsonb`,
  },
  // ── Config fidélité ───────────────────────────────────────────────────────
  {
    name: "create_loyalty_config",
    sql: `CREATE TABLE IF NOT EXISTS "LoyaltyConfig" (
      "id"             TEXT NOT NULL,
      "restaurantId"   TEXT NOT NULL,
      "enabled"        BOOLEAN NOT NULL DEFAULT false,
      "ptsPerEuro"     INTEGER NOT NULL DEFAULT 10,
      "minSpendCents"  INTEGER NOT NULL DEFAULT 0,
      "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoyaltyConfig_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "LoyaltyConfig_restaurantId_fkey"
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
      CONSTRAINT "LoyaltyConfig_restaurantId_key"
        UNIQUE ("restaurantId")
    )`,
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
