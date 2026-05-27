/**
 * Tarification MaTable.Pro — source de vérité côté admin.
 *
 * IMPORTANT : ces constantes DOIVENT rester strictement synchronisées avec
 *   apps/web/components/landing/landingData.ts  (MaTable.Atable)
 * Toute évolution tarifaire doit modifier les DEUX fichiers en même temps.
 *
 * Modèle : 3 forfaits fixes.
 *   - Mensuel : sans engagement, résiliable à tout moment
 *   - Annuel  : −12 % sur le mensuel, paiement mensuel ou en une fois
 *
 * Chaîne / Groupe : sur devis (DocumentsClient.tsx → devis-chaine)
 */

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 59,
    color: "emerald" as const,
    popular: false,
    desc: "L'essentiel pour digitaliser votre salle dès le premier jour.",
    features: [
      "Avis Google & Réputation (campagne QR, IA rédactionnelle)",
      "Commande & Paiement QR (menu digital, paiement fractionné)",
      "Portail Serveur · Portail Cuisine · Portail Caisse",
    ],
    featuresShort: ["Avis Google & Réputation", "Commande & Paiement QR", "Portail Serveur / Cuisine / Caisse"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 119,
    color: "orange" as const,
    popular: true,
    desc: "La solution complète pour piloter votre restaurant au quotidien.",
    features: [
      "Tout le forfait Starter",
      "Réservations Intelligentes (créneaux dynamiques, arrhes Stripe, anti no-show)",
    ],
    featuresShort: ["Tout Starter inclus", "Réservations Intelligentes & anti no-show"],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 249,
    color: "purple" as const,
    popular: false,
    desc: "Performance maximale — IA complète pour les restaurateurs ambitieux.",
    features: [
      "Tout le forfait Pro",
      "Nova Stock IA (liste de courses auto, alertes ruptures, food cost)",
      "Nova Finance IA (KPIs, marges, prévisions CA, recommandations rentabilité)",
      "Nova Contab IA (exports comptables, TVA, rapports de fin de mois)",
    ],
    featuresShort: ["Tout Pro inclus", "Nova Stock IA", "Nova Finance IA", "Nova Contab IA"],
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

/** Remise annuelle appliquée sur le prix mensuel (en %) */
export const ANNUAL_DISCOUNT_PERCENT = 12;

/** Prix mensuel effectif pour un abonnement annuel (arrondi à l'euro) */
export function getAnnualMonthlyPrice(monthly: number): number {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
}

export type Quote = {
  // Plan sélectionné
  planId: PlanId;
  planName: string;
  planFeatures: readonly string[];

  // Facturation
  billing: "monthly" | "annual";
  priceMonthly: number;      // prix mensuel affiché (peut être réduit si annuel)
  annualTotal?: number;      // total annuel à la signature (billing=annual uniquement)

  // Rétro-compat avec les champs utilisés dans DocumentTemplate
  monthly: number;           // alias de priceMonthly
  total: number;             // mensuel × 12 si annuel, sinon mensuel × 1
  mult: string;              // label affiché
  isAnnualPay: boolean;
  annualPayTotal?: number;   // alias de annualTotal
  durationLabel: string;
};

export function computeQuote(planId: PlanId, billing: "monthly" | "annual"): Quote {
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const priceMonthly = billing === "annual"
    ? getAnnualMonthlyPrice(plan.priceMonthly)
    : plan.priceMonthly;
  const annualTotal = billing === "annual" ? priceMonthly * 12 : undefined;

  return {
    planId: plan.id,
    planName: plan.name,
    planFeatures: plan.features,
    billing,
    priceMonthly,
    annualTotal,
    // Rétro-compat
    monthly: priceMonthly,
    total: billing === "annual" ? priceMonthly * 12 : priceMonthly,
    mult: billing === "annual" ? `−${ANNUAL_DISCOUNT_PERCENT} %` : "Sans engagement",
    isAnnualPay: billing === "annual",
    annualPayTotal: annualTotal,
    durationLabel: billing === "annual" ? "Annuel (−12 %)" : "Mensuel",
  };
}

// Formatage utilitaire euro standard FR
export function eur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
