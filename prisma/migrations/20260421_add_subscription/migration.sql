-- Migration: add subscription plans and Ollama API key to Restaurant
-- Version: 1.2

-- Create enum SubscriptionPlan
DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'PRO_IA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add subscription columns to Restaurant
ALTER TABLE "Restaurant"
  ADD COLUMN IF NOT EXISTS "subscription"            "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
  ADD COLUMN IF NOT EXISTS "ollamaApiKey"             TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStartedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt"    TIMESTAMP(3);
