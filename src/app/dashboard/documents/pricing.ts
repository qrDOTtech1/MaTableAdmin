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
    // Détail par fonctionnalité — affiché en italique sous chaque ligne dans les documents
    featuresDetailed: [
      { name: "Avis Google & Réputation", desc: "QR code de table déclenche une demande d'avis ; l'IA rédige une réponse personnalisée à chaque commentaire client pour votre compte." },
      { name: "Commande & Paiement QR", desc: "Le client scanne, consulte le menu digital, passe sa commande et paie depuis son téléphone — addition fractionnée ou entière, sans attente." },
      { name: "Portail Serveur", desc: "Application web temps réel : suivi des tables, appels service, statut des commandes et pourboires numériques pour chaque membre du personnel." },
      { name: "Portail Cuisine", desc: "Écran KDS plein écran : commandes affichées en grand, bump tactile à la touche, code couleur d'urgence et timer ajustable que le client voit s'actualiser en direct côté téléphone (le cuisto rallonge ou raccourcit l'attente en un clic)." },
      { name: "Portail Caisse", desc: "Vue encaissement sécurisée par PIN, vente au comptoir (cannette, café…) en quelques touches sans table dédiée, soldes, transactions Stripe et export Z de caisse journalier." },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 119,
    color: "orange" as const,
    popular: true,
    desc: "La solution complète pour piloter votre restaurant au quotidien.",
    features: [
      "Tout le forfait Starter dont Avis Google & Réputation, Commande & Paiement QR, Portail Serveur, Portail Cuisine et Portail Caisse",
      "Réservations Intelligentes (créneaux dynamiques, arrhes Stripe, anti no-show)",
      "Programme Fidélité inclus (clients, points, offres et récompenses)",
      "Statistiques actionnables avec recommandations IA en langage naturel",
      "Programme parrainage MaTable (12 codes/an, +30 jours à votre niveau par filleul converti, bonus Nova IA pour les parrains Starter)",
    ],
    featuresShort: ["Starter inclus : Avis Google, Commande QR, Portails Serveur/Cuisine/Caisse (cuisine bump + timer ajustable + vente comptoir)", "Réservations Intelligentes & anti no-show", "Programme Fidélité inclus", "Statistiques actionnables IA", "Parrainage 12 codes/an"],
    featuresDetailed: [
      { name: "Tout le forfait Starter dont Avis Google & Réputation, Commande & Paiement QR, Portail Serveur, Portail Cuisine et Portail Caisse", desc: "Le Pro reprend explicitement chaque brique du Starter : campagnes d'avis Google avec IA rédactionnelle, menu digital QR, paiement fractionné, suivi serveur, écran cuisine KDS avec bump et timer ajustable, et portail caisse sécurisé avec vente au comptoir." },
      { name: "Réservations Intelligentes", desc: "Créneaux dynamiques calculés selon votre capacité réelle ; arrhes encaissées automatiquement via Stripe ; SMS/email de rappel anti no-show envoyés 24 h avant." },
      { name: "Programme Fidélité", desc: "Base clients, points cumulés, niveaux VIP, offres personnalisées et récompenses configurables inclus dans le forfait Pro, sans abonnement fidélité séparé." },
      { name: "Statistiques actionnables", desc: "Tableau de bord renforcé : CA, ticket moyen, heatmap d'affluence jour × heure, plats stars vs plats jamais commandés, tendances vs période précédente, et recommandations en langage naturel (ex. « vos mardis chutent de 20 % : pensez à lancer une promo »)." },
      { name: "Programme parrainage MaTable", desc: "Un nouveau code parrainage par mois (12 codes par an). Chaque restaurateur que vous parrainez et qui devient payant vous offre 30 jours d'abonnement à votre niveau actuel (équivalent de votre forfait, pas un mois \"générique\"). Bonus Starter : vous débloquez en plus 30 jours d'accès Nova IA à votre 1re conversion — pour goûter à la Business sans payer le prix. Récompense versée uniquement à la 1re facture payée du filleul. Plafond théorique : une année entière gratuite." },
    ],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 249,
    color: "purple" as const,
    popular: false,
    desc: "Performance maximale — IA complète pour les restaurateurs ambitieux.",
    features: [
      "Tout le forfait Pro dont Starter complet, Réservations Intelligentes, Programme Fidélité, Statistiques actionnables IA et Programme parrainage inclus",
      "Nova Stock IA (liste de courses auto, alertes ruptures, food cost)",
      "Nova Finance IA (KPIs, marges, prévisions CA, recommandations rentabilité)",
      "Nova Contab IA (URSSAF, TVA, exports comptables, rapports de fin de mois)",
    ],
    featuresShort: ["Pro inclus : Starter + Réservations + Fidélité + Stats IA + Parrainage", "Nova Stock IA", "Nova Finance IA", "Nova Contab IA"],
    featuresDetailed: [
      { name: "Tout le forfait Pro dont Starter complet, Réservations Intelligentes, Programme Fidélité, Statistiques actionnables IA et Programme parrainage", desc: "Le Business reprend tout le Pro : Starter détaillé (Avis Google, Commande QR, Portails Serveur/Cuisine/Caisse avec KDS bump et vente comptoir) + Réservations Intelligentes + Programme Fidélité + Statistiques actionnables avec recommandations IA + Programme parrainage (12 codes/an, +30 j par filleul converti)." },
      { name: "Nova Stock IA", desc: "L'IA analyse vos ventes, génère automatiquement la liste de courses, anticipe les ruptures et calcule le food cost en temps réel." },
      { name: "Nova Finance IA", desc: "Tableau de bord financier : chiffre d'affaires, marges par plat, prévisions de revenus et recommandations concrètes pour améliorer la rentabilité." },
      { name: "Nova Contab IA", desc: "Synthèse URSSAF et TVA, export des données comptables formaté pour votre expert-comptable, déclarations TVA pré-préparées et rapports de clôture mensuelle en un clic." },
    ],
  },
] as const;

// ── Shims rétro-compatibilité ─────────────────────────────────────────────────
// Anciennes constantes MODULES / DURATIONS utilisées dans les plaquettes.
// Remplacées par PLANS mais conservées sous forme de tableaux synthétiques
// pour éviter de casser les documents existants.
export const MODULES = PLANS.flatMap((p) =>
  p.featuresDetailed.map((f, i) => ({
    id: `${p.id}_${i}`,
    name: f.name,
    desc: f.desc,
    price: p.priceMonthly,
    required: false,
    planId: p.id,
    planName: p.name,
  }))
);

export const DURATIONS = [
  { key: "monthly", label: "Mensuel (sans engagement)" },
  { key: "annual",  label: "Annuel (−12 %)" },
] as const;

export type DurationKey = "monthly" | "annual";
export type ModuleId = string;
export type QuoteLine = { label: string; priceHT: number; qty: number; totalHT: number };

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
