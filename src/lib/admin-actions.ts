import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SubscriptionPlan } from "@prisma/client";
import crypto from "crypto";

export async function updateRestaurant(id: string, formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  await prisma.restaurant.update({
    where: { id },
    data: { name, slug: slug || null },
  });

  revalidatePath(`/dashboard/restaurants/${id}`);
  revalidatePath("/dashboard");
}

// Mapping forfait UI → SubscriptionPlan enum Prisma
// "business" utilise PRO_IA (valeur enum existante) en attendant une migration Prisma
const PLAN_TO_ENUM: Record<string, SubscriptionPlan> = {
  starter:  "STARTER",
  pro:      "PRO",
  business: "PRO_IA",   // alias jusqu'à ajout de BUSINESS dans l'enum
  // legacy
  STARTER:  "STARTER",
  PRO:      "PRO",
  PRO_IA:   "PRO_IA",
};

// Apps activées par plan
const PLAN_APPS: Record<string, string[]> = {
  starter:  ["reviews", "reservations", "orders"],
  pro:      ["reviews", "reservations", "orders"],
  business: ["reviews", "reservations", "orders", "nova_ia", "nova_stock", "nova_contab", "nova_finance"],
};

// MRR mensuel HT par plan (centimes) — Starter 59€ / Pro 119€ / Business 249€
const PLAN_MRR_CENTS: Record<string, number> = { STARTER: 5900, PRO: 11900, PRO_IA: 24900 };

/**
 * Journalise un mouvement d'abonnement (churn/MRR historisé).
 * Non-bloquant : si la table n'existe pas encore (migration non lancée),
 * on avale l'erreur pour ne jamais casser le changement de forfait.
 */
async function logSubscriptionEvent(opts: {
  restaurantId: string;
  restaurantName?: string | null;
  type: "created" | "renewed" | "upgraded" | "downgraded" | "canceled";
  plan: string;
  mrrCents: number;
  mrrDeltaCents: number;
}) {
  try {
    const id = `se_${crypto.randomBytes(12).toString("hex")}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SubscriptionEvent"
        ("id","restaurantId","restaurantName","type","plan","mrrCents","mrrDeltaCents")
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      id, opts.restaurantId, opts.restaurantName ?? null, opts.type, opts.plan,
      opts.mrrCents, opts.mrrDeltaCents,
    );
  } catch (e) {
    console.warn("logSubscriptionEvent skipped:", (e as Error).message?.split("\n")[0]);
  }
}

export async function updateSubscription(id: string, formData: FormData) {
  "use server";
  const rawPlan = formData.get("subscription") as string;
  const subscription: SubscriptionPlan = PLAN_TO_ENUM[rawPlan] ?? "STARTER";

  const current = await prisma.restaurant.findUnique({
    where: { id },
    select: { subscription: true, ollamaApiKey: true, name: true, subscriptionStartedAt: true },
  });

  // Auto-génère une clé si upgrade vers Business / PRO_IA sans clé existante
  const needsNewKey = subscription === "PRO_IA" && !current?.ollamaApiKey;
  const ollamaApiKey = needsNewKey
    ? `nova_${crypto.randomBytes(24).toString("hex")}`
    : undefined;

  await prisma.restaurant.update({
    where: { id },
    data: {
      subscription,
      subscriptionStartedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ...(ollamaApiKey ? { ollamaApiKey } : {}),
    },
  });

  // Journalise le mouvement d'abonnement (churn/MRR historisé)
  const oldMrr = current?.subscriptionStartedAt ? (PLAN_MRR_CENTS[current.subscription] ?? 0) : 0;
  const newMrr = PLAN_MRR_CENTS[subscription] ?? 0;
  const evType = !current?.subscriptionStartedAt ? "created"
    : newMrr > oldMrr ? "upgraded"
    : newMrr < oldMrr ? "downgraded"
    : "renewed";
  await logSubscriptionEvent({
    restaurantId: id,
    restaurantName: current?.name,
    type: evType,
    plan: subscription,
    mrrCents: newMrr,
    mrrDeltaCents: newMrr - oldMrr,
  });

  // Met aussi à jour enabledApps selon le plan sélectionné
  const planKey = rawPlan.toLowerCase();
  const apps = PLAN_APPS[planKey] ?? PLAN_APPS.starter;
  await prisma.$executeRawUnsafe(
    `UPDATE "Restaurant" SET "enabledApps" = $1::jsonb WHERE id = $2`,
    JSON.stringify(apps), id,
  );

  revalidatePath(`/dashboard/restaurants/${id}`);
  revalidatePath("/dashboard");
}

export async function updateOllamaModels(id: string, formData: FormData) {
  "use server";
  const ollamaApiKey    = (formData.get("ollamaApiKey")     as string)?.trim() || undefined;
  const ollamaLangModel = (formData.get("ollamaLangModel")   as string)?.trim() || undefined;
  const ollamaVisionModel = (formData.get("ollamaVisionModel") as string)?.trim() || undefined;

  await prisma.restaurant.update({
    where: { id },
    data: {
      ...(ollamaApiKey      !== undefined ? { ollamaApiKey }      : {}),
      ...(ollamaLangModel   !== undefined ? { ollamaLangModel }   : {}),
      ...(ollamaVisionModel !== undefined ? { ollamaVisionModel } : {}),
    },
  });

  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function regenerateOllamaKey(id: string) {
  "use server";
  const newKey = `nova_${crypto.randomBytes(24).toString("hex")}`;
  await prisma.restaurant.update({
    where: { id },
    data: { ollamaApiKey: newKey },
  });
  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function revokeOllamaKey(id: string) {
  "use server";
  await prisma.restaurant.update({
    where: { id },
    data: { ollamaApiKey: null },
  });
  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function updateCaissePin(id: string, formData: FormData) {
  "use server";
  const raw = (formData.get("caissePin") as string)?.trim();
  const pin = /^\d{4,8}$/.test(raw) ? raw : null;
  await prisma.restaurant.update({
    where: { id },
    data: { caissePin: pin } as any,
  });
  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function updateContactEmail(id: string, formData: FormData) {
  "use server";
  const contactEmail = (formData.get("contactEmail") as string)?.trim() || null;

  await prisma.$executeRawUnsafe(
    `UPDATE "Restaurant" SET "contactEmail" = $1 WHERE id = $2`,
    contactEmail, id,
  );

  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function updateStripeKeys(id: string, formData: FormData) {
  "use server";
  const stripeSecretKey    = (formData.get("stripeSecretKey")    as string)?.trim() || null;
  const stripePublicKey    = (formData.get("stripePublicKey")    as string)?.trim() || null;
  const stripeWebhookSecret = (formData.get("stripeWebhookSecret") as string)?.trim() || null;

  // Use raw SQL since these columns aren't in prisma schema
  await prisma.$executeRawUnsafe(
    `UPDATE "Restaurant" SET "stripeSecretKey" = $1, "stripePublicKey" = $2, "stripeWebhookSecret" = $3 WHERE id = $4`,
    stripeSecretKey, stripePublicKey, stripeWebhookSecret, id,
  );

  revalidatePath(`/dashboard/restaurants/${id}`);
}

// ── App gating — modular app system ──────────────────────────────────────────
// App IDs: reviews, reservations, orders, nova_ia, nova_stock, nova_contab, nova_finance
export async function updateEnabledApps(id: string, formData: FormData) {
  "use server";
  // Build enabledApps from checkbox fields: app_reviews, app_reservations, etc.
  const ALL_APPS = ["reviews", "reservations", "orders", "nova_ia", "nova_stock", "nova_contab", "nova_finance"];
  const apps: string[] = [];
  for (const appId of ALL_APPS) {
    if (formData.has(`app_${appId}`)) apps.push(appId);
  }
  // Ensure "reviews" is always included (base app)
  if (!apps.includes("reviews")) apps.unshift("reviews");

  await prisma.$executeRawUnsafe(
    `UPDATE "Restaurant" SET "enabledApps" = $1::jsonb WHERE id = $2`,
    JSON.stringify(apps), id,
  );

  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function updateServerUniqueQr(id: string, formData: FormData) {
  "use server";
  const enabled = formData.has("serverUniqueReviewQr");
  await prisma.$executeRawUnsafe(
    `UPDATE "Restaurant" SET "serverUniqueReviewQr" = $1 WHERE id = $2`,
    enabled, id,
  );
  revalidatePath(`/dashboard/restaurants/${id}`);
}

// ── Config billing plateforme (Stripe Billing pour facturer les restos) ──────
export type PlatformBilling = {
  enabled: boolean;
  stripeSecretKey: string;
  stripePublicKey: string;
  stripeWebhookSecret: string;
  currency: string;        // "eur"
  trialDays: number;
  prices: {
    starter:  { monthly: string; yearly: string };
    pro:      { monthly: string; yearly: string };
    business: { monthly: string; yearly: string };
  };
};

const EMPTY_BILLING: PlatformBilling = {
  enabled: false,
  stripeSecretKey: "", stripePublicKey: "", stripeWebhookSecret: "",
  currency: "eur", trialDays: 0,
  prices: {
    starter:  { monthly: "", yearly: "" },
    pro:      { monthly: "", yearly: "" },
    business: { monthly: "", yearly: "" },
  },
};

export async function getPlatformBilling(): Promise<PlatformBilling> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ platformBilling: any }>>(
      `SELECT "platformBilling" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1`
    );
    const raw = rows[0]?.platformBilling ?? {};
    return {
      ...EMPTY_BILLING,
      ...raw,
      prices: { ...EMPTY_BILLING.prices, ...(raw?.prices ?? {}) },
    };
  } catch {
    return EMPTY_BILLING;
  }
}

export async function updatePlatformBilling(formData: FormData) {
  "use server";
  const g = (k: string) => ((formData.get(k) as string) ?? "").trim();
  const billing: PlatformBilling = {
    enabled: formData.has("enabled"),
    stripeSecretKey:     g("stripeSecretKey"),
    stripePublicKey:     g("stripePublicKey"),
    stripeWebhookSecret: g("stripeWebhookSecret"),
    currency:            g("currency") || "eur",
    trialDays:           Math.max(0, parseInt(g("trialDays") || "0", 10) || 0),
    prices: {
      starter:  { monthly: g("price_starter_monthly"),  yearly: g("price_starter_yearly") },
      pro:      { monthly: g("price_pro_monthly"),       yearly: g("price_pro_yearly") },
      business: { monthly: g("price_business_monthly"),  yearly: g("price_business_yearly") },
    },
  };
  await prisma.$executeRawUnsafe(
    `INSERT INTO "GlobalConfig" (id, "platformBilling") VALUES ('global', $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET "platformBilling" = $1::jsonb, "updatedAt" = CURRENT_TIMESTAMP`,
    JSON.stringify(billing),
  );
  revalidatePath("/dashboard/billing-config");
}

export async function deleteRestaurant(id: string) {
  "use server";
  // Journalise le churn AVANT suppression (les events n'ont pas de FK, ils survivent)
  const resto = await prisma.restaurant.findUnique({
    where: { id },
    select: { name: true, subscription: true, subscriptionStartedAt: true },
  });
  if (resto?.subscriptionStartedAt) {
    const mrr = PLAN_MRR_CENTS[resto.subscription] ?? 0;
    await logSubscriptionEvent({
      restaurantId: id,
      restaurantName: resto.name,
      type: "canceled",
      plan: resto.subscription,
      mrrCents: 0,
      mrrDeltaCents: -mrr,
    });
  }
  await prisma.restaurant.delete({ where: { id } });
  revalidatePath("/dashboard");
}
