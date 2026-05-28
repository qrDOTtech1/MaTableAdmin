import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import {
  updateRestaurant,
  updateSubscription,
  updateOllamaModels,
  regenerateOllamaKey,
  revokeOllamaKey,
  updateCaissePin,
  updateStripeKeys,
  updateContactEmail,
  updateServerUniqueQr,
  deleteRestaurant,
  recordManualPayment,
} from "@/lib/admin-actions";
import Link from "next/link";
import UsersManager from "./UsersManager";
import QrStickerWidget from "./QrStickerWidget";

export const dynamic = "force-dynamic";

// ── Catalogue modeles IA Ollama Cloud ──────────────────────────────────────────
// Only models verified working with our Ollama Cloud API key (tested 2026-04-26)
const LANG_MODELS: { id: string; label: string; tier: string; desc: string }[] = [
  { id: "gpt-oss:120b",           label: "GPT-OSS 120B",               tier: "Best",   desc: "Meilleure qualite — recommande par defaut" },
  { id: "gpt-oss:20b",            label: "GPT-OSS 20B",                tier: "Fast",   desc: "Rapide et leger" },
  { id: "deepseek-v3.2",          label: "DeepSeek V3.2 671B",         tier: "Best",   desc: "Tres grand modele, excellente qualite" },
  { id: "deepseek-v3.1:671b",     label: "DeepSeek V3.1 671B",         tier: "Best",   desc: "Version stable, haute qualite" },
  { id: "mistral-large-3:675b",   label: "Mistral Large 3 675B",       tier: "Best",   desc: "Plus grand Mistral — excellent francais" },
  { id: "cogito-2.1:671b",        label: "Cogito 2.1 671B",            tier: "Best",   desc: "Raisonnement avance, grande precision" },
  { id: "qwen3-coder:480b",       label: "Qwen 3 Coder 480B",          tier: "Code",   desc: "Specialise code et generation technique" },
  { id: "gemma4:31b",             label: "Gemma 4 31B (Google)",        tier: "Fast",   desc: "Leger, rapide, Google open-source" },
  { id: "gemma3:27b",             label: "Gemma 3 27B (Google)",        tier: "Fast",   desc: "Rapide et economique" },
  { id: "minimax-m2.7",           label: "MiniMax M2.7",                tier: "Best",   desc: "Grand modele MiniMax — polyvalent" },
  { id: "nemotron-3-super",       label: "Nemotron 3 Super (NVIDIA)",   tier: "Best",   desc: "NVIDIA — excellent suivi instructions" },
  { id: "devstral-2:123b",        label: "Devstral 2 123B",             tier: "Code",   desc: "Mistral — specialise dev" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview",      tier: "Fast",   desc: "Google — rapide, preview" },
];

const VISION_MODELS: { id: string; label: string; desc: string }[] = [
  { id: "qwen3-vl:235b",          label: "Qwen 3 VL 235B",             desc: "Meilleure analyse image — recommande pour Magic Scan" },
  { id: "qwen3-vl:235b-instruct", label: "Qwen 3 VL 235B Instruct",   desc: "Version instruct — ideal pour JSON structure" },
  { id: "gemma4:31b",             label: "Gemma 4 31B Vision (Google)", desc: "Vision Google, rapide et precis" },
  { id: "gemma3:27b",             label: "Gemma 3 27B Vision (Google)", desc: "Vision economique Google" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview",     desc: "Preview Google Cloud — rapide" },
];

// ── Nouveaux forfaits (Starter / Pro / Business) ─────────────────────────────
const PLANS = [
  {
    id: "starter",
    enumVal: "STARTER",
    label: "Starter",
    priceMonthly: 59,
    color: "text-emerald-300",
    bg: "bg-emerald-900/30",
    border: "border-emerald-600",
    dot: "bg-emerald-400",
    features: [
      "Avis Google & Réputation (QR, IA rédactionnelle)",
      "Commande & Paiement QR (menu digital, paiement fractionné)",
      "Portail Serveur · Portail Cuisine · Portail Caisse",
      "Réservations Intelligentes (créneaux, arrhes Stripe, anti no-show)",
    ],
  },
  {
    id: "pro",
    enumVal: "PRO",
    label: "Pro",
    priceMonthly: 119,
    color: "text-orange-300",
    bg: "bg-orange-900/30",
    border: "border-orange-600",
    dot: "bg-orange-400",
    popular: true,
    features: [
      "Tout le forfait Starter dont Avis Google, Commande QR, Paiement QR, Portail Serveur, Portail Cuisine et Portail Caisse",
      "Nova IA — chatbot, Magic Scan, génération menu, accords",
      "Programme Fidélité inclus — clients, points, niveaux VIP, offres, récompenses",
    ],
  },
  {
    id: "business",
    enumVal: "PRO_IA",   // enum Prisma existante — alias jusqu'à migration BUSINESS
    label: "Business",
    priceMonthly: 249,
    color: "text-purple-300",
    bg: "bg-purple-900/30",
    border: "border-purple-600",
    dot: "bg-purple-400",
    features: [
      "Tout le forfait Pro dont Starter complet, Réservations Intelligentes et Programme Fidélité",
      "Programme Fidélité inclus dans Pro — clients, points, niveaux VIP, offres, récompenses",
      "Nova Stock IA — gestion stocks, alertes, courses",
      "Nova Finance IA — conseils, promotions anti-gaspillage",
      "Nova Contab IA — comptabilité, URSSAF/TVA, export",
    ],
  },
] as const;

// Reverse lookup : enum Prisma → plan
const ENUM_TO_PLAN: Record<string, typeof PLANS[number]> = {
  STARTER: PLANS[0],
  PRO:     PLANS[1],
  PRO_IA:  PLANS[2],
};

export default async function RestaurantManagePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { users: true, tables: true, menuItems: true },
  });
  if (!restaurant) notFound();

  async function handleDelete() { "use server"; await deleteRestaurant(id); redirect("/dashboard"); }
  async function handleRegenKey() { "use server"; await regenerateOllamaKey(id); }
  async function handleRevokeKey() { "use server"; await revokeOllamaKey(id); }

  const plan = ENUM_TO_PLAN[restaurant.subscription as string] ?? PLANS[0];
  const currentLang   = (restaurant as any).ollamaLangModel   ?? "gpt-oss:120b";
  const currentVision = (restaurant as any).ollamaVisionModel ?? "qwen3-vl:235b";
  const currentApiKey = (restaurant as any).ollamaApiKey ?? "";
  const currentCaissePin = (restaurant as any).caissePin ?? "";

  // Contact email for public page
  const contactEmailRows = await prisma.$queryRaw<Array<{ contactEmail: string | null; email: string | null }>>`
    SELECT "contactEmail", email FROM "Restaurant" WHERE id = ${id} LIMIT 1
  `;
  const currentContactEmail = contactEmailRows[0]?.contactEmail ?? contactEmailRows[0]?.email ?? "";

  // Stripe per-restaurant keys
  const stripeKeys = await prisma.$queryRaw<Array<{ stripeSecretKey: string | null; stripePublicKey: string | null; stripeWebhookSecret: string | null }>>`
    SELECT "stripeSecretKey", "stripePublicKey", "stripeWebhookSecret"
    FROM "Restaurant" WHERE id = ${id} LIMIT 1
  `.then(r => r[0] ?? { stripeSecretKey: null, stripePublicKey: null, stripeWebhookSecret: null });

  // serverUniqueReviewQr — default true if column doesn't exist yet
  const serverUniqueQrRows = await prisma.$queryRaw<Array<{ serverUniqueReviewQr: boolean | null }>>`
    SELECT "serverUniqueReviewQr" FROM "Restaurant" WHERE id = ${id} LIMIT 1
  `.catch(() => [{ serverUniqueReviewQr: true }]);
  const serverUniqueReviewQr: boolean = serverUniqueQrRows[0]?.serverUniqueReviewQr ?? true;

  return (
    <div className="p-8 max-w-5xl space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">← Retour</Link>
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${plan.bg} ${plan.color} ${plan.border}`}>
          Forfait {plan.label} — {plan.priceMonthly}€/mois
        </span>
        <div className="ml-auto flex items-center gap-4">
          <Link 
            href={`/dashboard/restaurants/${id}/documents`}
            className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
          >
            📄 Documents Contractuels
          </Link>
          <div className="text-xs text-slate-500 font-mono">ID: {restaurant.id}</div>
        </div>
      </div>

      {/* ── Infos + Activité ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-4">Informations générales</h2>
          <form action={updateRestaurant.bind(null, id)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nom</label>
              <input name="name" defaultValue={restaurant.name}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Slug (URL)</label>
              <input name="slug" defaultValue={restaurant.slug || ""}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono" />
            </div>
            <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Enregistrer
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-bold">Activité</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-xs text-slate-400 mb-1">Tables</div>
              <div className="text-3xl font-bold">{restaurant.tables.length}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-xs text-slate-400 mb-1">Plats au menu</div>
              <div className="text-3xl font-bold">{restaurant.menuItems.length}</div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 mb-3">👤 Utilisateurs & Accès</h3>
            <UsersManager restaurantId={restaurant.id} restaurantSlug={restaurant.slug ?? ""} />
          </div>
        </div>
      </div>

      {/* ── Compte & Accès ── */}
      <div className="bg-slate-900 border border-blue-500/20 p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-xl">🔐</div>
          <div>
            <h2 className="text-lg font-bold text-white">Compte &amp; Accès</h2>
            <p className="text-slate-400 text-sm">Utilisateurs, mots de passe, réinitialisations</p>
          </div>
          {restaurant.slug && (
            <a href={`https://matable.pro/${restaurant.slug}`} target="_blank" rel="noopener"
              className="ml-auto px-4 py-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-colors flex-shrink-0">
              🚀 Dashboard client
            </a>
          )}
        </div>
        <UsersManager restaurantId={restaurant.id} restaurantSlug={restaurant.slug ?? ""} />
      </div>

      {/* ── Forfait d'abonnement ── */}
      <div className={`bg-slate-900 border p-6 rounded-xl space-y-6 ${plan.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${plan.bg}`}>💳</div>
          <div>
            <h2 className="text-lg font-bold text-white">Forfait d'abonnement</h2>
            <p className="text-xs text-slate-400">
              Forfait actif :&nbsp;
              <span className={`font-bold ${plan.color}`}>{plan.label}</span>
              &nbsp;— {plan.priceMonthly}€/mois HT
              {restaurant.subscriptionStartedAt && (
                <> · depuis le {new Date(restaurant.subscriptionStartedAt).toLocaleDateString("fr-FR")}</>
              )}
              {restaurant.subscriptionExpiresAt && (
                <> · expire le {new Date(restaurant.subscriptionExpiresAt).toLocaleDateString("fr-FR")}</>
              )}
            </p>
          </div>
        </div>

        <form action={updateSubscription.bind(null, id)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(p => {
              const isCurrent = plan.id === p.id;
              return (
                <label key={p.id} className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                  isCurrent
                    ? `${p.border} ${p.bg}`
                    : "border-slate-700 hover:border-slate-500 bg-slate-800/50"
                }`}>
                  <input
                    type="radio"
                    name="subscription"
                    value={p.id}
                    defaultChecked={isCurrent}
                    className="sr-only"
                  />
                  {/* Popular badge */}
                  {"popular" in p && p.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] px-2 py-0.5 bg-orange-500 text-white rounded-full font-bold">⭐ POPULAIRE</span>
                    </div>
                  )}
                  {/* Plan header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${p.dot}`}></div>
                    <span className={`font-bold text-sm ${isCurrent ? p.color : "text-white"}`}>{p.label}</span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-white/10 text-white rounded">ACTIF</span>
                    )}
                  </div>
                  <div className={`text-2xl font-black mb-3 ${isCurrent ? p.color : "text-slate-200"}`}>
                    {p.priceMonthly}€
                    <span className="text-xs font-normal text-slate-400">/mois HT</span>
                  </div>
                  <ul className="space-y-1 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </label>
              );
            })}
          </div>

          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
            <p className="text-xs text-blue-400">
              Changer de forfait met à jour automatiquement les applications activées pour ce restaurant.
              La date de souscription est réinitialisée à aujourd'hui.
            </p>
          </div>

          <button type="submit"
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors text-sm">
            💾 Appliquer le forfait
          </button>
        </form>

        {/* ── Paiement manuel (chèque / espèces / virement) ── */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">💶 Enregistrer un paiement reçu</h3>
          <p className="text-xs text-slate-400 mb-3">
            Le resto t'a payé hors Stripe ? Enregistre-le : ça prolonge son abonnement
            et alimente le suivi MRR / Churn (forfait actuel : <span className={plan.color}>{plan.label}</span> · {plan.priceMonthly}€/mois).
          </p>
          <form action={recordManualPayment.bind(null, id)} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Moyen</label>
              <select name="method" className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="virement">Virement</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Période</label>
              <select name="interval" className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="monthly">+ 1 mois</option>
                <option value="yearly">+ 1 an</option>
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-400 mb-1">Note (optionnel)</label>
              <input name="note" type="text" placeholder="N° chèque, réf virement…"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <button type="submit"
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-sm">
              ✓ Encaisser
            </button>
          </form>
        </div>
      </div>

      {/* ── Service Caisse ── */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">💳</div>
          <div>
            <h2 className="text-lg font-bold text-white">Service Caisse</h2>
            <p className="text-xs text-slate-400">Accès caissier via PIN — vue encaissement à <code className="text-emerald-400">/{restaurant.slug}/caisse</code></p>
          </div>
        </div>
        <form action={updateCaissePin.bind(null, id)} className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-400 mb-1">PIN Caisse (4-8 chiffres)</label>
            <input
              name="caissePin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              maxLength={8}
              defaultValue={currentCaissePin}
              placeholder="ex : 1234"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono tracking-widest text-lg"
            />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Enregistrer
          </button>
        </form>
        {currentCaissePin ? (
          <p className="text-xs text-emerald-400/70">✓ PIN configuré — le caissier peut se connecter sur <strong>/{restaurant.slug}/caisse</strong></p>
        ) : (
          <p className="text-xs text-slate-600">Aucun PIN défini — service caisse désactivé</p>
        )}
      </div>

      {/* ── Email de contact (affiche sur page publique) ── */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">✉️</div>
          <div>
            <h2 className="text-lg font-bold text-white">Email de contact public</h2>
            <p className="text-xs text-slate-400">Affiche sur la page publique du restaurant et sur les tickets de caisse</p>
          </div>
        </div>

        <form action={updateContactEmail.bind(null, id)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email affiche aux clients</label>
            <input
              name="contactEmail"
              type="email"
              defaultValue={currentContactEmail}
              placeholder="contact@monrestaurant.fr ou monresto@matablepro.fr"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <p className="text-xs text-slate-500">
            Si vide, l'email du compte proprietaire sera utilise. Vous pouvez utiliser un email personnalise type <strong className="text-blue-400">{restaurant.slug ?? "monresto"}@matablepro.fr</strong>.
          </p>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Enregistrer
          </button>
        </form>

        {currentContactEmail ? (
          <p className="text-xs text-emerald-400/70">Email public actuel : <strong>{currentContactEmail}</strong></p>
        ) : (
          <p className="text-xs text-slate-600">Aucun email de contact configure — l'email du compte sera utilise</p>
        )}
      </div>

      {/* ── Configuration Stripe / Paiement ── */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">💳</div>
          <div>
            <h2 className="text-lg font-bold text-white">Paiement Stripe</h2>
            <p className="text-xs text-slate-400">Cles Stripe du restaurant — Google Pay & Apple Pay actives automatiquement</p>
          </div>
        </div>

        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
          <p className="text-xs text-blue-400">
            <strong>Google Pay + Apple Pay :</strong> actives automatiquement via Stripe Checkout. Il suffit que le compte Stripe ait active ces methodes dans
            <a href="https://dashboard.stripe.com/settings/payment_methods" target="_blank" rel="noopener" className="underline ml-1">
              Stripe Dashboard &gt; Settings &gt; Payment Methods
            </a>.
          </p>
          <p className="text-xs text-blue-400/70 mt-1">
            Pour Apple Pay : verifier le domaine dans <strong>Stripe Dashboard &gt; Settings &gt; Apple Pay</strong>.
          </p>
        </div>

        <form action={updateStripeKeys.bind(null, id)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Cle publique (pk_live_... ou pk_test_...)</label>
            <input
              name="stripePublicKey"
              type="text"
              defaultValue={stripeKeys.stripePublicKey ?? ""}
              placeholder="pk_live_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Cle secrete (sk_live_... ou sk_test_...)</label>
            <input
              name="stripeSecretKey"
              type="password"
              defaultValue={stripeKeys.stripeSecretKey ?? ""}
              placeholder="sk_live_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Webhook secret (whsec_...)</label>
            <input
              name="stripeWebhookSecret"
              type="password"
              defaultValue={stripeKeys.stripeWebhookSecret ?? ""}
              placeholder="whsec_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
            />
          </div>

          <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Enregistrer les cles Stripe
          </button>
        </form>

        {stripeKeys.stripeSecretKey ? (
          <p className="text-xs text-emerald-400/70">✓ Cles Stripe configurees — paiement actif pour ce restaurant</p>
        ) : (
          <p className="text-xs text-slate-600">Aucune cle Stripe — le paiement utilisera les cles globales (si configurees)</p>
        )}
      </div>

      {/* ── Configuration IA (forfait Business) ── */}
      {(restaurant.subscription === "PRO_IA" || plan.id === "business") && (
        <div className="bg-slate-900 border border-orange-600/40 p-6 rounded-xl space-y-8">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-xl">🦙</div>
            <div>
              <h2 className="text-lg font-bold text-white">Configuration NovaTech IA</h2>
              <p className="text-xs text-slate-400">Modeles IA — Ollama Cloud (cle globale configuree dans Admin Settings)</p>
            </div>
          </div>

          <form action={updateOllamaModels.bind(null, id)} className="space-y-8">

            {/* ─ Clé API info ─ */}
            <div className="space-y-3">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="text-sm text-blue-400 font-bold">🔑 Cle API Ollama Cloud</p>
                <p className="text-xs text-slate-400 mt-1">
                  La cle API est configuree globalement dans <strong>Admin Settings</strong>.
                  Tous les restaurants PRO_IA partagent la meme cle.
                </p>
                {currentApiKey && (
                  <p className="text-xs text-emerald-400 mt-2">✓ Ce restaurant a aussi une cle propre configuree</p>
                )}
              </div>
              <input type="hidden" name="ollamaApiKey" value={currentApiKey} />
            </div>

            {/* ─ Modele Langage ─ */}
            <div className="space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2 flex-wrap">
                🗣️ Modele Langage (Ollama Cloud)
                <span className="text-xs font-normal text-slate-400">— Chatbot Nova · Descriptions IA · Planning · Defis quotidiens</span>
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {LANG_MODELS.map(m => {
                  const isSelected = currentLang === m.id;
                  return (
                    <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                    }`}>
                      <input type="radio" name="ollamaLangModel" value={m.id} defaultChecked={isSelected} className="accent-orange-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-white">{m.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">{m.tier}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ─ Modele Vision (Magic Scan) ─ */}
            <div className="space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2 flex-wrap">
                👁️ Modele Vision (Ollama Cloud)
                <span className="text-xs font-normal text-slate-400">— Magic Scan · Analyse photo plat · OCR menu</span>
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {VISION_MODELS.map(m => {
                  const isSelected = currentVision === m.id;
                  return (
                    <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? "border-purple-500 bg-purple-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                    }`}>
                      <input type="radio" name="ollamaVisionModel" value={m.id} defaultChecked={isSelected} className="accent-purple-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-white">{m.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Vision</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors text-sm">
              💾 Enregistrer la configuration IA
            </button>
          </form>
        </div>
      )}

      {/* ── Configuration Avis Google ── */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-xl">⭐</div>
          <div>
            <h2 className="text-lg font-bold text-white">Configuration Avis Google</h2>
            <p className="text-xs text-slate-400">Paramétrage du module Avis — QR / NFC et attribution aux serveurs</p>
          </div>
        </div>

        <form action={updateServerUniqueQr.bind(null, id)} className="space-y-4">
          <div className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
            serverUniqueReviewQr ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-800/50"
          }`}>
            <div className="pt-0.5">
              <input
                type="checkbox"
                name="serverUniqueReviewQr"
                id="serverUniqueReviewQr"
                defaultChecked={serverUniqueReviewQr}
                className="accent-emerald-500 w-5 h-5"
              />
            </div>
            <label htmlFor="serverUniqueReviewQr" className="flex-1 cursor-pointer">
              <div className="font-semibold text-white text-sm">ID unique par serveur</div>
              <p className="text-xs text-slate-400 mt-1">
                <strong className="text-emerald-400">Activé (recommandé) :</strong> chaque serveur dispose de son propre QR code / NFC.
                Les avis Google sont attribués nominativement au serveur concerné — le client voit <em>"Qui vous a servi ?"</em> et choisit parmi les serveurs actifs.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                <strong className="text-slate-400">Désactivé :</strong> un seul QR / NFC pour le restaurant entier. Aucun serveur ne peut être créé. L'avis est enregistré sans attribution individuelle.
              </p>
            </label>
          </div>

          {!serverUniqueReviewQr && (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                <p className="text-xs text-amber-400">
                  ⚠️ Mode <strong>QR unique restaurant</strong> actif — les serveurs ne peuvent pas être créés.
                  Pour créer des serveurs et activer l'attribution nominative, activez l'option ci-dessus.
                </p>
              </div>
              {restaurant.slug && (
                <QrStickerWidget slug={restaurant.slug} restaurantName={restaurant.name} />
              )}
            </div>
          )}

          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm">
            Enregistrer
          </button>
        </form>
      </div>

      {/* ── Zone de danger ── */}
      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl">
        <h2 className="text-lg font-bold text-red-400 mb-2">Zone de Danger</h2>
        <p className="text-red-400/60 text-sm mb-4">Irréversible — toutes les commandes, menus et accès seront supprimés.</p>
        <form action={handleDelete}>
          <button className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Supprimer définitivement
          </button>
        </form>
      </div>
    </div>
  );
}
