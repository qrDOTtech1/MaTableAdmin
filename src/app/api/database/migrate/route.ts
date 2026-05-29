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
  // ── Fidélité sur session commande ─────────────────────────────────────────
  {
    name: "add_session_customer_email",
    sql: `ALTER TABLE "TableSession" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT`,
  },
  {
    name: "add_session_customer_phone",
    sql: `ALTER TABLE "TableSession" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT`,
  },
  {
    name: "add_session_loyalty_customer_id",
    sql: `ALTER TABLE "TableSession" ADD COLUMN IF NOT EXISTS "loyaltyCustomerId" TEXT`,
  },
  // ── Quota couverts par créneau ────────────────────────────────────────────
  {
    name: "add_max_covers_per_slot",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "maxCoversPerSlot" INTEGER`,
  },
  // ── Raccourcis rapides dashboard ──────────────────────────────────────────
  {
    name: "add_dashboard_quick_actions",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "dashboardQuickActions" JSONB NOT NULL DEFAULT '[]'::jsonb`,
  },
  // ── Onboarding guidé 1er login ────────────────────────────────────────────
  {
    name: "add_onboarding_completed",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false`,
  },
  // ── Fix casse email : normalise les comptes existants en lowercase ─────────
  // Les inscriptions avec majuscules ne matchaient pas le login (qui lowercase
  // l'email) → impossible de se connecter. On ne touche pas une ligne si la
  // version lowercase existe déjà (évite toute violation d'unicité).
  {
    name: "lowercase_existing_user_emails",
    sql: `UPDATE "User" u
            SET email = LOWER(email)
          WHERE email <> LOWER(email)
            AND NOT EXISTS (
              SELECT 1 FROM "User" u2
              WHERE u2.email = LOWER(u.email) AND u2.id <> u.id
            )`,
  },
  // ── Config billing plateforme (Stripe Billing — facturer les restos) ──────
  {
    name: "create_global_config",
    sql: `CREATE TABLE IF NOT EXISTS "GlobalConfig" (
      "id"        TEXT NOT NULL DEFAULT 'global',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    name: "add_platform_billing",
    sql: `ALTER TABLE "GlobalConfig" ADD COLUMN IF NOT EXISTS "platformBilling" JSONB NOT NULL DEFAULT '{}'::jsonb`,
  },
  {
    name: "add_platform_stripe_customer",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "platformStripeCustomerId" TEXT`,
  },
  {
    name: "add_platform_stripe_subscription",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "platformStripeSubscriptionId" TEXT`,
  },
  {
    name: "add_billing_past_due",
    sql: `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "billingPastDue" BOOLEAN NOT NULL DEFAULT false`,
  },
  {
    name: "seed_global_config_row",
    sql: `INSERT INTO "GlobalConfig" (id) VALUES ('global') ON CONFLICT (id) DO NOTHING`,
  },
  // ── Journal d'abonnements SaaS (churn / MRR historisé) ────────────────────
  // PAS de FK vers Restaurant : les events doivent survivre à la suppression
  // d'un resto pour conserver l'historique de churn.
  {
    name: "create_subscription_event",
    sql: `CREATE TABLE IF NOT EXISTS "SubscriptionEvent" (
      "id"             TEXT NOT NULL,
      "restaurantId"   TEXT NOT NULL,
      "restaurantName" TEXT,
      "type"           TEXT NOT NULL,
      "plan"           TEXT NOT NULL,
      "mrrCents"       INTEGER NOT NULL DEFAULT 0,
      "mrrDeltaCents"  INTEGER NOT NULL DEFAULT 0,
      "amountCents"    INTEGER NOT NULL DEFAULT 0,
      "interval"       TEXT,
      "invoiceNumber"  TEXT,
      "stripeInvoiceUrl" TEXT,
      "method"         TEXT,
      "note"           TEXT,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    name: "add_subscription_event_method",
    sql: `ALTER TABLE "SubscriptionEvent" ADD COLUMN IF NOT EXISTS "method" TEXT`,
  },
  {
    name: "add_subscription_event_note",
    sql: `ALTER TABLE "SubscriptionEvent" ADD COLUMN IF NOT EXISTS "note" TEXT`,
  },
  // Champs facture (montant réellement encaissé, n° facture, lien Stripe)
  {
    name: "add_subscription_event_amount",
    sql: `ALTER TABLE "SubscriptionEvent" ADD COLUMN IF NOT EXISTS "amountCents" INTEGER NOT NULL DEFAULT 0`,
  },
  {
    name: "add_subscription_event_interval",
    sql: `ALTER TABLE "SubscriptionEvent" ADD COLUMN IF NOT EXISTS "interval" TEXT`,
  },
  {
    name: "add_subscription_event_invoice_number",
    sql: `ALTER TABLE "SubscriptionEvent" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT`,
  },
  {
    name: "add_subscription_event_invoice_url",
    sql: `ALTER TABLE "SubscriptionEvent" ADD COLUMN IF NOT EXISTS "stripeInvoiceUrl" TEXT`,
  },
  {
    name: "create_subscription_event_idx_created",
    sql: `CREATE INDEX IF NOT EXISTS "SubscriptionEvent_createdAt_idx" ON "SubscriptionEvent"("createdAt")`,
  },
  {
    name: "create_subscription_event_idx_resto",
    sql: `CREATE INDEX IF NOT EXISTS "SubscriptionEvent_restaurantId_idx" ON "SubscriptionEvent"("restaurantId")`,
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
