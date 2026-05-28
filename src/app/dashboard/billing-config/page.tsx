import { getPlatformBilling, updatePlatformBilling } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

export default async function BillingConfigPage() {
  const b = await getPlatformBilling();
  const configured = !!b.stripeSecretKey;

  return (
    <div className="p-4 sm:p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Facturation plateforme</h1>
        <p className="text-slate-400">Configuration Stripe Billing pour facturer les restaurants (mensuel &amp; annuel).</p>
        <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
          b.enabled && configured ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        }`}>
          {b.enabled && configured ? "✅ Actif" : "⏸ Non actif (config à compléter)"}
        </div>
      </div>

      <form action={updatePlatformBilling} className="space-y-8">
        {/* Activation */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="enabled" defaultChecked={b.enabled}
              className="w-5 h-5 rounded accent-orange-500" />
            <div>
              <p className="font-bold text-white">Activer la facturation automatique</p>
              <p className="text-xs text-slate-400">Quand actif, les restos s'abonnent et sont prélevés via Stripe.</p>
            </div>
          </label>
        </section>

        {/* Clés Stripe plateforme */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-white">🔑 Clés Stripe (plateforme MaTable)</h2>
          <p className="text-xs text-slate-500 -mt-2">Compte Stripe de MaTable. Utilise tes clés de test d'abord (sk_test_… / pk_test_…).</p>
          <Field name="stripeSecretKey"     label="Clé secrète (sk_…)"      defaultValue={b.stripeSecretKey} mono />
          <Field name="stripePublicKey"     label="Clé publique (pk_…)"     defaultValue={b.stripePublicKey} mono />
          <Field name="stripeWebhookSecret" label="Secret webhook (whsec_…)" defaultValue={b.stripeWebhookSecret} mono />
        </section>

        {/* Tarifs / Price IDs */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="font-bold text-white">💶 Identifiants de prix Stripe (Price IDs)</h2>
          <p className="text-xs text-slate-500 -mt-2">Crée 6 prix dans Stripe (3 forfaits × mensuel/annuel) et colle leurs ID (price_…).</p>

          <PlanPrices plan="starter"  label="Starter · 59€/mois"  m={b.prices.starter.monthly}  y={b.prices.starter.yearly} />
          <PlanPrices plan="pro"      label="Pro · 119€/mois"     m={b.prices.pro.monthly}      y={b.prices.pro.yearly} />
          <PlanPrices plan="business" label="Business · 249€/mois" m={b.prices.business.monthly} y={b.prices.business.yearly} />
        </section>

        {/* Options */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 grid grid-cols-2 gap-4">
          <Field name="currency"  label="Devise"            defaultValue={b.currency} />
          <Field name="trialDays" label="Jours d'essai (0 = aucun)" defaultValue={String(b.trialDays)} type="number" />
        </section>

        <div className="flex items-center gap-3">
          <button type="submit"
            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-colors">
            💾 Enregistrer la configuration
          </button>
          <span className="text-xs text-slate-500">Le branchement Checkout/webhooks lira automatiquement cette config.</span>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, defaultValue, type = "text", mono }: {
  name: string; label: string; defaultValue?: string; type?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function PlanPrices({ plan, label, m, y }: { plan: string; label: string; m: string; y: string }) {
  return (
    <div className="border-t border-slate-800 pt-4 first:border-0 first:pt-0">
      <p className="text-sm font-semibold text-orange-400 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field name={`price_${plan}_monthly`} label="Price ID mensuel" defaultValue={m} mono />
        <Field name={`price_${plan}_yearly`}  label="Price ID annuel"  defaultValue={y} mono />
      </div>
    </div>
  );
}
