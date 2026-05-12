-- Migration : table PricingRequest (demandes de souscription depuis landing /tarifs)
CREATE TABLE IF NOT EXISTS "PricingRequest" (
  "id"                     TEXT PRIMARY KEY,
  "status"                 TEXT NOT NULL DEFAULT 'NEW',
  "restaurantName"         TEXT NOT NULL,
  "managerName"            TEXT NOT NULL,
  "email"                  TEXT NOT NULL,
  "phone"                  TEXT,
  "city"                   TEXT,
  "selectedModules"        TEXT[] NOT NULL DEFAULT '{}',
  "engagement"             TEXT NOT NULL,
  "monthlyHtCents"         INTEGER NOT NULL DEFAULT 0,
  "totalHtCents"           INTEGER NOT NULL DEFAULT 0,
  "volumePercent"          INTEGER NOT NULL DEFAULT 0,
  "message"                TEXT,
  "sourceUrl"              TEXT,
  "convertedRestaurantId"  TEXT,
  "convertedAt"            TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PricingRequest_status_createdAt_idx" ON "PricingRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PricingRequest_createdAt_idx" ON "PricingRequest"("createdAt");
