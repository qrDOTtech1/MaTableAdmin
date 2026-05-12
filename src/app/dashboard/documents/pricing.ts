/**
 * Tarification MaTable — source de vérité côté admin.
 *
 * IMPORTANT : ces constantes DOIVENT rester strictement synchronisées avec
 *   apps/web/components/landing/landingData.ts  (MaTable.Atable)
 * Toute évolution tarifaire doit modifier les DEUX fichiers en même temps.
 *
 * Modèle : prix de référence = engagement 12 mois.
 *   - 3m  : × 1.07 (le plus cher, "sans risque")
 *   - 6m  : × 1.05
 *   - 9m  : × 1.03
 *   - 12m : × 1.00 (référence)
 *   - 12a : × 0.95 (paiement annuel, -5%)
 *
 * Remise volume (application sur le total HT mensuel après application du
 * multiplicateur de durée) :
 *   - 1 module  : 0 %
 *   - 2 modules : 10 %
 *   - 3 modules : 15 %
 *   - 4+ modules : 20 %
 */

export const MODULES = [
  { id: "avis",         name: "Avis Google & Réputation",     desc: "Campagne QR, IA rédactionnelle, bons de réduction auto.",                                                              price: 79,  required: true  },
  { id: "qr",           name: "Commande & Paiement",          desc: "Menu digital QR, paiement fractionné ou espèces, tickets.",                                                            price: 99,  required: false },
  { id: "server",       name: "Portail Serveur (Live)",       desc: "Portail serveur, cuisine et caisse — gestion tables, suivi temps réel, appels instantanés.",                            price: 69,  required: false },
  { id: "stock",        name: "Nova Stock IA",                desc: "Listes de courses auto, alertes ruptures, food cost. Quota mensuel inclus.",                                            price: 89,  required: false },
  { id: "finance",      name: "Nova Finance IA",              desc: "Food cost réel, KPIs, marges, prévisions CA et recommandations de rentabilité. Quota mensuel inclus.",                  price: 69,  required: false },
  { id: "contab",       name: "Nova Contab IA",               desc: "Exports comptables, TVA, rapports de fin de mois intelligents. Quota mensuel inclus.",                                  price: 69,  required: false },
  { id: "reservations", name: "Réservations Intelligentes",   desc: "Créneaux dynamiques, arrhes Stripe, confirmation automatique, anti no-show, gestion de salle temps réel.",              price: 129, required: false },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

export const DURATIONS = [
  { key: "3m",  label: "3 mois",            sub: "Sans risque",        realMult: 1.07 },
  { key: "6m",  label: "6 mois",            sub: "Le plus populaire",  realMult: 1.05 },
  { key: "9m",  label: "9 mois",            sub: "Presque annuel",     realMult: 1.03 },
  { key: "12m", label: "12 mois",           sub: "Référence",          realMult: 1.00 },
  { key: "12a", label: "12 mois — annuel",  sub: "Paiement annuel",    realMult: 0.95 },
] as const;

export type DurationKey = (typeof DURATIONS)[number]["key"];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function volumePercentFor(count: number) {
  if (count >= 4) return 20;
  if (count === 3) return 15;
  if (count === 2) return 10;
  return 0;
}

export type QuoteLine = {
  id: string;
  name: string;
  desc: string;
  basePrice: number;     // prix 12m de référence
  unitPrice: number;     // prix unitaire après multiplicateur de durée (avant remise volume)
  required: boolean;
};

export type Quote = {
  // Modules sélectionnés avec leur ligne tarifaire (déjà multipliée par la durée)
  modules: QuoteLine[];

  // Engagement
  durationKey: DurationKey;
  durationLabel: string;
  realMult: number;
  isAnnualPay: boolean;

  // Calculs (tous en € HT)
  subtotal: number;          // somme des unitPrice, AVANT remise volume
  volumePercent: number;     // 0 / 10 / 15 / 20
  volumeAmount: number;      // montant de la remise volume
  monthlyHT: number;         // total mensuel HT après remise — c'est CE qui est facturé chaque mois
  totalEngagement: number;   // monthlyHT × durée en mois (= total période d'engagement)
  annualPayTotal?: number;   // pour 12a : monthlyHT × 12, à payer en une fois

  // Rétro-compat avec les anciens champs PriceInfo
  monthly: number;           // alias de monthlyHT
  total: number;             // alias de totalEngagement
  mult: string;              // label visible de la majoration ("+7%", "0%", "-5%"…)
};

/**
 * Calcule un devis complet à partir des modules sélectionnés et de la durée.
 * Reproduit exactement la formule du PricingBuilder de la landing.
 */
export function computeQuote(selectedIds: readonly string[], durationKey: DurationKey): Quote {
  const dur = DURATIONS.find((d) => d.key === durationKey) ?? DURATIONS[3]; // défaut 12m
  const isAnnualPay = dur.key === "12a";

  // S'assurer qu'on a au moins le module "avis" (requis)
  const ids = new Set<string>(selectedIds);
  ids.add("avis");

  // Lignes tarifaires
  const modules: QuoteLine[] = [];
  for (const m of MODULES) {
    if (!ids.has(m.id)) continue;
    const unitPrice = round2(m.price * dur.realMult);
    modules.push({
      id: m.id,
      name: m.name,
      desc: m.desc,
      basePrice: m.price,
      unitPrice,
      required: m.required,
    });
  }

  const subtotal = round2(modules.reduce((s, m) => s + m.unitPrice, 0));
  const volumePercent = volumePercentFor(modules.length);
  const volumeAmount = round2(subtotal * (volumePercent / 100));
  const monthlyHT = round2(subtotal - volumeAmount);

  // Durée en mois pour le total période
  const months = dur.key === "3m" ? 3
              : dur.key === "6m" ? 6
              : dur.key === "9m" ? 9
              : 12;
  const totalEngagement = round2(monthlyHT * months);

  // Label majoration vs 12m
  const mult =
    dur.key === "3m" ? "+7%"
    : dur.key === "6m" ? "+5%"
    : dur.key === "9m" ? "+3%"
    : dur.key === "12a" ? "−5%"
    : "0%";

  return {
    modules,
    durationKey: dur.key,
    durationLabel: dur.label,
    realMult: dur.realMult,
    isAnnualPay,
    subtotal,
    volumePercent,
    volumeAmount,
    monthlyHT,
    totalEngagement,
    annualPayTotal: isAnnualPay ? round2(monthlyHT * 12) : undefined,
    // Aliases rétro-compat
    monthly: monthlyHT,
    total: totalEngagement,
    mult,
  };
}

// Formatage utilitaire euro standard FR
export function eur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
