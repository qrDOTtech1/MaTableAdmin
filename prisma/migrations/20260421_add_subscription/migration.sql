-- Migration: add subscription plans, Ollama API key and model selection to Restaurant
-- Version: 1.3

-- Create enum SubscriptionPlan
DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'PRO_IA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add subscription + Ollama columns to Restaurant
ALTER TABLE "Restaurant"
  ADD COLUMN IF NOT EXISTS "subscription"          "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
  ADD COLUMN IF NOT EXISTS "ollamaApiKey"           TEXT,
  ADD COLUMN IF NOT EXISTS "ollamaLangModel"        TEXT DEFAULT 'gpt-oss:120b',
  ADD COLUMN IF NOT EXISTS "ollamaVisionModel"      TEXT DEFAULT 'llama3.2-vision:11b',
  ADD COLUMN IF NOT EXISTS "subscriptionStartedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt"  TIMESTAMP(3);
