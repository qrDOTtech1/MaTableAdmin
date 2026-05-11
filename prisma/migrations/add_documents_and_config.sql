-- ─────────────────────────────────────────────────────────────────────────
-- Migration manuelle : ajoute GeneratedDocument + AdminConfig sans toucher
-- aux tables existantes (DB partagée avec MaTable-API).
--
-- Appliquer :
--   psql $DATABASE_URL -f prisma/migrations/add_documents_and_config.sql
-- OU (Railway / Neon / Supabase) coller dans la console SQL.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "GeneratedDocument" (
  "id"              TEXT PRIMARY KEY,
  "restaurantId"    TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "number"          TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "totalCents"      INTEGER NOT NULL DEFAULT 0,
  "vendor"          JSONB NOT NULL,
  "client"          JSONB NOT NULL,
  "data"            JSONB NOT NULL,
  "pdfUrl"          TEXT,
  "signedAt"        TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"       TEXT,
  "archivedInMonth" TEXT,
  CONSTRAINT "GeneratedDocument_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "GeneratedDocument_restaurantId_createdAt_idx"
  ON "GeneratedDocument"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_type_createdAt_idx"
  ON "GeneratedDocument"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_createdAt_idx"
  ON "GeneratedDocument"("createdAt");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_archivedInMonth_idx"
  ON "GeneratedDocument"("archivedInMonth");

CREATE TABLE IF NOT EXISTS "AdminConfig" (
  "id"                 TEXT PRIMARY KEY DEFAULT 'default',
  "archiveRecipient"   TEXT,
  "archiveEnabled"     BOOLEAN NOT NULL DEFAULT false,
  "archiveDayOfMonth"  INTEGER NOT NULL DEFAULT 1,
  "lastArchiveSentAt"  TIMESTAMP(3),
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Row singleton — créée vide si absente
INSERT INTO "AdminConfig" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;
