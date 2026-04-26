import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import {
  updateRestaurant,
  updateSubscription,
  updateOllamaModels,
  regenerateOllamaKey,
  revokeOllamaKey,
  updateCaissePin,
  deleteRestaurant,
} from "@/lib/admin-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Catalogue modeles IA Ollama Cloud ──────────────────────────────────────────
const LANG_MODELS: { id: string; label: string; tier: string; desc: string }[] = [
  { id: "gpt-oss:120b",           label: "GPT-OSS 120B",               tier: "Best",   desc: "Meilleure qualite — recommande par defaut" },
  { id: "gpt-oss:20b",            label: "GPT-OSS 20B",                tier: "Fast",   desc: "Rapide et leger" },
  { id: "deepseek-v4-flash",      label: "DeepSeek V4 Flash",          tier: "Best",   desc: "Dernier modele DeepSeek — rapide, excellent raisonnement" },
  { id: "deepseek-v3.2",          label: "DeepSeek V3.2 671B",         tier: "Best",   desc: "Tres grand modele, excellente qualite" },
  { id: "kimi-k2.6",              label: "Kimi K2.6",                   tier: "Best",   desc: "MoE puissant, excellent multi-tache" },
  { id: "qwen3.5:397b",           label: "Qwen 3.5 397B",              tier: "Best",   desc: "Alibaba — fort en raisonnement et code" },
  { id: "gemma4:31b",             label: "Gemma 4 31B (Google)",        tier: "Fast",   desc: "Leger, rapide, Google open-source" },
  { id: "mistral-large-3:675b",   label: "Mistral Large 3 675B",       tier: "Best",   desc: "Plus grand Mistral — excellent francais" },
  { id: "minimax-m2.7",           label: "MiniMax M2.7",                tier: "Best",   desc: "Grand modele MiniMax — polyvalent" },
  { id: "cogito-2.1:671b",        label: "Cogito 2.1 671B",            tier: "Best",   desc: "Raisonnement avance, grande precision" },
];

const VISION_MODELS: { id: string; label: string; desc: string }[] = [
  { id: "qwen3-vl:235b",          label: "Qwen 3 VL 235B",             desc: "Meilleure analyse image — recommande pour Magic Scan" },
  { id: "qwen3-vl:235b-instruct", label: "Qwen 3 VL 235B Instruct",   desc: "Version instruct — ideal pour JSON structure" },
  { id: "gemma4:31b",             label: "Gemma 4 31B Vision (Google)", desc: "Vision Google, rapide et precis" },
  { id: "gemma3:27b",             label: "Gemma 3 27B Vision (Google)", desc: "Vision economique Google" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview",     desc: "Preview Google Cloud — rapide" },
];

const PLANS = {
  STARTER: { label: "Starter",            price: "49,99€/mois",  color: "text-slate-300",  bg: "bg-slate-700/50",    border: "border-slate-600" },
  PRO:     { label: "Pro",                price: "139,99€/mois", color: "text-blue-300",   bg: "bg-blue-900/30",     border: "border-blue-700" },
  PRO_IA:  { label: "Pro + NovaTech IA",  price: "299€/mois",    color: "text-orange-300", bg: "bg-orange-900/30",   border: "border-orange-600" },
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

  const plan = PLANS[restaurant.subscription as keyof typeof PLANS] ?? PLANS.STARTER;
  const currentLang   = (restaurant as any).ollamaLangModel   ?? "gpt-oss:120b";
  const currentVision = (restaurant as any).ollamaVisionModel ?? "qwen3-vl:235b";
  const currentApiKey = (restaurant as any).ollamaApiKey ?? "";
  const currentCaissePin = (restaurant as any).caissePin ?? "";

  // All models use the global Ollama Cloud key — no per-provider detection needed

  return (
    <div className="p-8 max-w-5xl space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">← Retour</Link>
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${plan.bg} ${plan.color} ${plan.border}`}>
          {plan.label}
        </span>
        <div className="ml-auto text-xs text-slate-500 font-mono">ID: {restaurant.id}</div>
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
          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 mb-2">Utilisateurs</h3>
            {restaurant.users.map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm text-slate-300 py-1">
                <span>{u.email}</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded uppercase">Owner</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Souscription ── */}
      <div className={`bg-slate-900 border p-6 rounded-xl space-y-4 ${plan.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold">💳 Souscription NovaTech</h2>
          <span className={`text-sm px-3 py-1 rounded-full font-semibold border ${plan.bg} ${plan.color} ${plan.border}`}>
            {plan.label} — {plan.price}
          </span>
        </div>
        <form action={updateSubscription.bind(null, id)} className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-400 mb-1">Niveau d'abonnement</label>
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
        {restaurant.subscriptionStartedAt && (
          <div className="text-xs text-slate-500 flex gap-6 flex-wrap">
            <span>Début : {new Date(restaurant.subscriptionStartedAt).toLocaleDateString("fr-FR")}</span>
            {restaurant.subscriptionExpiresAt && (
              <span>Expire : {new Date(restaurant.subscriptionExpiresAt).toLocaleDateString("fr-FR")}</span>
            )}
          </div>
        )}
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

      {/* ── Configuration IA (PRO_IA uniquement) ── */}
      {restaurant.subscription === "PRO_IA" && (
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
