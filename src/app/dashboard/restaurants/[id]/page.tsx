import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { updateRestaurant, updateSubscription, regenerateOllamaKey, revokeOllamaKey, deleteRestaurant } from "@/lib/admin-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PLANS = {
  STARTER: { label: "Starter", price: "49,99€/mois", color: "text-slate-300", bg: "bg-slate-700" },
  PRO:     { label: "Pro",     price: "139,99€/mois", color: "text-blue-300",  bg: "bg-blue-900/50" },
  PRO_IA:  { label: "Pro + NovaTech IA", price: "299€/mois", color: "text-orange-300", bg: "bg-orange-900/50" },
};

export default async function RestaurantManagePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { users: true, tables: true, menuItems: true },
  });

  if (!restaurant) notFound();

  async function handleDelete() {
    "use server";
    await deleteRestaurant(id);
    redirect("/dashboard");
  }

  async function handleRegenKey() {
    "use server";
    await regenerateOllamaKey(id);
  }

  async function handleRevokeKey() {
    "use server";
    await revokeOllamaKey(id);
  }

  const plan = PLANS[restaurant.subscription as keyof typeof PLANS] ?? PLANS.STARTER;

  return (
    <div className="p-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">← Retour</Link>
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        <span className={`text-xs px-2 py-1 rounded font-semibold ${plan.bg} ${plan.color}`}>
          {plan.label}
        </span>
        <div className="ml-auto text-xs text-slate-500 font-mono">ID: {restaurant.id}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Infos générales */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-4">Informations générales</h2>
          <form action={updateRestaurant.bind(null, id)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nom du restaurant</label>
              <input name="name" defaultValue={restaurant.name}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Slug (URL publique)</label>
              <input name="slug" defaultValue={restaurant.slug || ""}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono" />
            </div>
            <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Enregistrer
            </button>
          </form>
        </div>

        {/* Activité rapide */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-bold">Activité</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-xs text-slate-400">Tables</div>
              <div className="text-2xl font-bold">{restaurant.tables.length}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-xs text-slate-400">Plats au menu</div>
              <div className="text-2xl font-bold">{restaurant.menuItems.length}</div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 mb-2">Utilisateurs</h3>
            <ul className="space-y-1">
              {restaurant.users.map(u => (
                <li key={u.id} className="text-sm text-slate-300 flex items-center justify-between">
                  <span>{u.email}</span>
                  <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded uppercase">Owner</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Souscription NovaTech ─── */}
      <div className="bg-slate-900 border border-orange-500/30 p-6 rounded-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">✨ Souscription NovaTech</h2>
          <div className={`text-sm px-3 py-1 rounded-full font-semibold ${plan.bg} ${plan.color}`}>
            {plan.label} — {plan.price}
          </div>
        </div>

        {/* Changement de plan */}
        <form action={updateSubscription.bind(null, id)} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Changer le niveau</label>
            <select name="subscription" defaultValue={restaurant.subscription}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white">
              <option value="STARTER">Starter — 49,99€/mois (30 tables)</option>
              <option value="PRO">Pro — 139,99€/mois (illimité + analytics)</option>
              <option value="PRO_IA">Pro + NovaTech IA — 299€/mois (IA complète)</option>
            </select>
          </div>
          <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Appliquer
          </button>
        </form>

        {/* Dates */}
        {restaurant.subscriptionStartedAt && (
          <div className="text-xs text-slate-500 flex gap-6">
            <span>Début : {new Date(restaurant.subscriptionStartedAt).toLocaleDateString("fr-FR")}</span>
            {restaurant.subscriptionExpiresAt && (
              <span>Expire : {new Date(restaurant.subscriptionExpiresAt).toLocaleDateString("fr-FR")}</span>
            )}
          </div>
        )}

        {/* Clé API Ollama — visible uniquement si PRO_IA */}
        {restaurant.subscription === "PRO_IA" && (
          <div className="mt-4 bg-black/30 border border-orange-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-orange-400">🔑 Clé API Ollama (NovaTech IA)</h3>
              <span className="text-[10px] text-orange-400/60 bg-orange-500/10 px-2 py-0.5 rounded">Confidentielle</span>
            </div>

            {restaurant.ollamaApiKey ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-orange-300 break-all font-mono">
                    {restaurant.ollamaApiKey}
                  </code>
                </div>
                <p className="text-[11px] text-slate-500">
                  À configurer dans la variable <code className="text-orange-400">OLLAMA_API_KEY</code> de l'API MaTable pour ce restaurant.
                </p>
                <div className="flex gap-3">
                  <form action={handleRegenKey}>
                    <button type="submit" className="text-xs px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg font-semibold transition-colors">
                      🔄 Régénérer la clé
                    </button>
                  </form>
                  <form action={handleRevokeKey}>
                    <button type="submit" className="text-xs px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-semibold transition-colors">
                      ✕ Révoquer
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">
                Aucune clé générée. Appliquez le plan <strong>Pro + NovaTech IA</strong> pour en créer une automatiquement.
              </div>
            )}
          </div>
        )}

        {/* Features incluses */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fonctionnalités incluses</p>
          <ul className="space-y-1 text-sm text-slate-300">
            <li>✅ Commandes QR & paiement Stripe</li>
            <li>✅ Dashboard temps réel (Socket.io)</li>
            {restaurant.subscription !== "STARTER" && <><li>✅ Export Z comptable</li><li>✅ Analytics avancées</li></>}
            {restaurant.subscription === "PRO_IA" && (
              <>
                <li>✨ Magic Scan — Vision IA pour créer les plats</li>
                <li>✨ Chatbot Nova — assistant client en temps réel</li>
                <li>✨ Gamification serveur — leaderboard & quêtes IA</li>
                <li>✨ Planning IA — prédiction d'affluence</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Zone de danger */}
      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl">
        <h2 className="text-lg font-bold text-red-400 mb-2">Zone de Danger</h2>
        <p className="text-red-400/60 text-sm mb-4">La suppression est irréversible — toutes les commandes, menus et accès seront supprimés.</p>
        <form action={handleDelete}>
          <button className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Supprimer définitivement
          </button>
        </form>
      </div>
    </div>
  );
}
