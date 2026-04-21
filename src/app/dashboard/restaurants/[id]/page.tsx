import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import {
  updateRestaurant,
  updateSubscription,
  updateOllamaModels,
  regenerateOllamaKey,
  revokeOllamaKey,
  deleteRestaurant,
} from "@/lib/admin-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Catalogue des modèles Ollama ──────────────────────────────────────────────
const LANG_MODELS = [
  // ── Cloud (ollama.com) ─────────────────────────────────────────────────────
  { id: "gpt-oss:120b",       label: "GPT-OSS 120B",       cloud: true,  params: "120B", desc: "Meilleur équilibre qualité/vitesse — recommandé" },
  { id: "gpt-oss:120b-cloud", label: "GPT-OSS 120B Cloud", cloud: true,  params: "120B", desc: "Version cloud optimisée, latence réduite" },
  // ── Local ──────────────────────────────────────────────────────────────────
  { id: "llama3.3:70b",       label: "Llama 3.3",          cloud: false, params: "70B",  desc: "Meta — excellent pour le français" },
  { id: "llama3.1:8b",        label: "Llama 3.1",          cloud: false, params: "8B",   desc: "Léger, rapide, bon pour prod" },
  { id: "mistral:7b",         label: "Mistral 7B",         cloud: false, params: "7B",   desc: "Français natif, très efficace" },
  { id: "mistral-nemo:12b",   label: "Mistral Nemo",       cloud: false, params: "12B",  desc: "Multilingue, raisonnement avancé" },
  { id: "qwen2.5:72b",        label: "Qwen 2.5",           cloud: false, params: "72B",  desc: "Excellent multilangue et code" },
  { id: "phi4:14b",           label: "Phi-4",              cloud: false, params: "14B",  desc: "Microsoft — compact mais puissant" },
  { id: "gemma3:27b",         label: "Gemma 3",            cloud: false, params: "27B",  desc: "Google — équilibré et rapide" },
];

const VISION_MODELS = [
  // ── Cloud (ollama.com) ─────────────────────────────────────────────────────
  { id: "llama3.2-vision:90b-cloud", label: "Llama 3.2 Vision 90B Cloud", cloud: true,  params: "90B",  desc: "Meilleure analyse d'image — recommandé pour Magic Scan" },
  // ── Local ──────────────────────────────────────────────────────────────────
  { id: "llama3.2-vision:11b",       label: "Llama 3.2 Vision",           cloud: false, params: "11B",  desc: "Meta — vision généraliste, bon équilibre" },
  { id: "llava:34b",                 label: "LLaVA 34B",                  cloud: false, params: "34B",  desc: "Vision haute résolution, détail fin" },
  { id: "llava:13b",                 label: "LLaVA 13B",                  cloud: false, params: "13B",  desc: "Version allégée, bonne vitesse" },
  { id: "minicpm-v:8b",             label: "MiniCPM-V",                  cloud: false, params: "8B",   desc: "Compact, excellent OCR et analyse plats" },
  { id: "moondream:1.8b",           label: "Moondream",                  cloud: false, params: "1.8B", desc: "Ultra-léger, parfait si GPU limité" },
  { id: "bakllava:7b",              label: "BakLLaVA",                   cloud: false, params: "7B",   desc: "Spécialisé analyse visuelle culinaire" },
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
  const currentVision = (restaurant as any).ollamaVisionModel ?? "llama3.2-vision:11b";

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

      {/* ── Configuration IA (PRO_IA uniquement) ── */}
      {restaurant.subscription === "PRO_IA" && (
        <div className="bg-slate-900 border border-orange-600/40 p-6 rounded-xl space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-xl">✨</div>
            <div>
              <h2 className="text-lg font-bold text-white">Configuration NovaTech IA</h2>
              <p className="text-xs text-slate-400">Clé API & sélection des modèles Ollama pour ce restaurant</p>
            </div>
          </div>

          <form action={updateOllamaModels.bind(null, id)} className="space-y-8">

            {/* ─ Clé API ─ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-orange-400 font-bold text-sm">🔑 Clé API ollama.com</span>
                <a href="https://ollama.com/settings/keys" target="_blank"
                  className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
                  → Créer une clé ↗
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  name="ollamaApiKey"
                  type="password"
                  defaultValue={(restaurant as any).ollamaApiKey || ""}
                  placeholder="ollama_..."
                  className="flex-1 bg-black/40 border border-orange-500/20 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                />
                {(restaurant as any).ollamaApiKey && (
                  <div className="flex gap-2">
                    <form action={handleRegenKey}>
                      <button type="submit" title="Régénérer"
                        className="px-3 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors">
                        🔄
                      </button>
                    </form>
                    <form action={handleRevokeKey}>
                      <button type="submit" title="Révoquer"
                        className="px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors">
                        ✕
                      </button>
                    </form>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Cette clé permet à l'API MaTable de s'authentifier sur <code className="text-orange-400">https://ollama.com/api</code>
              </p>
            </div>

            {/* ─ Modèle Langage ─ */}
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  🗣️ Modèle Langage
                  <span className="text-xs font-normal text-slate-400">— Chatbot Nova · Descriptions · Planning IA · Copywriting</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {/* Cloud */}
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest mt-1">☁️ Cloud ollama.com</p>
                {LANG_MODELS.filter(m => m.cloud).map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    currentLang === m.id
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                  }`}>
                    <input type="radio" name="ollamaLangModel" value={m.id} defaultChecked={currentLang === m.id} className="accent-orange-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{m.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-mono">{m.params}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Cloud</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                ))}
                {/* Local */}
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">🖥️ Local / Self-hosted</p>
                {LANG_MODELS.filter(m => !m.cloud).map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    currentLang === m.id
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                  }`}>
                    <input type="radio" name="ollamaLangModel" value={m.id} defaultChecked={currentLang === m.id} className="accent-orange-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{m.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-600 text-slate-300 rounded font-mono">{m.params}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ─ Modèle Vision ─ */}
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  👁️ Modèle Vision
                  <span className="text-xs font-normal text-slate-400">— Magic Scan · Analyse photo plat · OCR menu</span>
                </h3>
                <p className="text-xs text-amber-400/80 mt-1">
                  ⚠️ Ces modèles analysent des images — requis pour le Magic Scan. Différents des modèles langage.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {/* Cloud */}
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest mt-1">☁️ Cloud ollama.com</p>
                {VISION_MODELS.filter(m => m.cloud).map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    currentVision === m.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                  }`}>
                    <input type="radio" name="ollamaVisionModel" value={m.id} defaultChecked={currentVision === m.id} className="accent-purple-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{m.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono">{m.params}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Cloud</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                ))}
                {/* Local */}
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">🖥️ Local / Self-hosted</p>
                {VISION_MODELS.filter(m => !m.cloud).map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    currentVision === m.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                  }`}>
                    <input type="radio" name="ollamaVisionModel" value={m.id} defaultChecked={currentVision === m.id} className="accent-purple-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{m.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-600 text-slate-300 rounded font-mono">{m.params}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                ))}
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
