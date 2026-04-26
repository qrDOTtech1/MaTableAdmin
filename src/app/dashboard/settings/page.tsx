import { prisma } from "@/lib/db";
import { saveGlobalIaConfig, revokeGlobalKey } from "@/lib/ia-actions";

export const dynamic = "force-dynamic";

// ── Catalogue modèles ─────────────────────────────────────────────────────────
type ProviderBadge = "openai" | "anthropic" | "google" | "mistral";

const PROVIDER_STYLE: Record<ProviderBadge, { label: string; bg: string; text: string }> = {
  openai:    { label: "OpenAI",    bg: "bg-emerald-500/20", text: "text-emerald-400" },
  anthropic: { label: "Anthropic", bg: "bg-orange-500/20",  text: "text-orange-400"  },
  google:    { label: "Google",    bg: "bg-blue-500/20",    text: "text-blue-400"    },
  mistral:   { label: "Mistral",   bg: "bg-purple-500/20",  text: "text-purple-400"  },
};

const PROVIDER_KEY_HINT: Record<ProviderBadge, { placeholder: string; url: string; urlLabel: string }> = {
  openai:    { placeholder: "sk-...",     url: "https://platform.openai.com/api-keys",          urlLabel: "platform.openai.com"  },
  anthropic: { placeholder: "sk-ant-...", url: "https://console.anthropic.com/settings/keys",  urlLabel: "console.anthropic.com" },
  google:    { placeholder: "AIzaSy...",  url: "https://aistudio.google.com/app/apikey",         urlLabel: "aistudio.google.com"  },
  mistral:   { placeholder: "...",        url: "https://console.mistral.ai/api-keys",            urlLabel: "console.mistral.ai"   },
};

const LANG_MODELS: { id: string; label: string; provider: ProviderBadge; tier: string; desc: string }[] = [
  { id: "gpt-4o",                      label: "GPT-4o",            provider: "openai",    tier: "Best",   desc: "Meilleure qualité — multimodal, vision native" },
  { id: "gpt-4o-mini",                 label: "GPT-4o Mini",       provider: "openai",    tier: "Fast $", desc: "Rapide et économique — recommandé par défaut" },
  { id: "claude-3-5-sonnet-20241022",  label: "Claude 3.5 Sonnet", provider: "anthropic", tier: "Best",   desc: "Excellent français, raisonnement, long contexte" },
  { id: "claude-3-haiku-20240307",     label: "Claude 3 Haiku",    provider: "anthropic", tier: "Fast $", desc: "Ultra-rapide, très économique" },
  { id: "gemini-1.5-pro",              label: "Gemini 1.5 Pro",    provider: "google",    tier: "Best",   desc: "Grande fenêtre contexte (1M tokens), multimodal" },
  { id: "gemini-1.5-flash",            label: "Gemini 1.5 Flash",  provider: "google",    tier: "Fast $", desc: "Rapide et économique, idéal pour chatbot" },
  { id: "mistral-large-latest",        label: "Mistral Large",     provider: "mistral",   tier: "Best",   desc: "Meilleur modèle Mistral — excellent pour le français" },
  { id: "mistral-small-latest",        label: "Mistral Small",     provider: "mistral",   tier: "Fast $", desc: "Léger, rapide, modèle français souverain" },
];

const VISION_MODELS: { id: string; label: string; provider: ProviderBadge; desc: string }[] = [
  { id: "gpt-4o",                      label: "GPT-4o Vision",             provider: "openai",    desc: "Meilleure analyse image — recommandé pour Magic Scan" },
  { id: "gpt-4o-mini",                 label: "GPT-4o Mini Vision",        provider: "openai",    desc: "Rapide et économique pour scan menu" },
  { id: "claude-3-5-sonnet-20241022",  label: "Claude 3.5 Sonnet Vision",  provider: "anthropic", desc: "Vision haute précision, excellent OCR" },
  { id: "gemini-1.5-pro",              label: "Gemini 1.5 Pro Vision",     provider: "google",    desc: "Analyse détaillée, haute résolution, multi-image" },
  { id: "gemini-1.5-flash",            label: "Gemini 1.5 Flash Vision",   provider: "google",    desc: "Rapide pour scan plats et OCR" },
];

export default async function AdminSettingsPage() {
  const rows = await prisma.$queryRaw<Array<{
    iaApiKey: string | null;
    iaLangModel: string;
    iaVisionModel: string;
    updatedAt: Date;
  }>>`SELECT "iaApiKey", "iaLangModel", "iaVisionModel", "updatedAt" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1`;

  const config = rows[0] ?? { iaApiKey: null, iaLangModel: "gpt-4o-mini", iaVisionModel: "gpt-4o", updatedAt: null };

  const currentLang   = config.iaLangModel   ?? "gpt-4o-mini";
  const currentVision = config.iaVisionModel ?? "gpt-4o";
  const hasKey        = !!config.iaApiKey;

  const currentProvider: ProviderBadge =
    currentLang.startsWith("claude-") ? "anthropic"
    : currentLang.startsWith("gemini-") ? "google"
    : currentLang.startsWith("mistral") ? "mistral"
    : "openai";

  const ps   = PROVIDER_STYLE[currentProvider];
  const hint = PROVIDER_KEY_HINT[currentProvider];

  return (
    <div className="p-8 max-w-3xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-4xl">🤖</span> Nova Connect IA
        </h1>
        <p className="text-slate-400 mt-1">
          Une seule clé API, utilisée automatiquement par{" "}
          <strong className="text-white">tous les restaurants PRO_IA</strong>.
          Chatbot, Magic Scan, Planning IA, Défis quotidiens — tout passe par cette config.
        </p>
      </div>

      {/* Statut */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
        hasKey ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
      }`}>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${hasKey ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
        <div className="flex-1">
          {hasKey ? (
            <>
              <p className="text-emerald-400 font-bold text-sm">✓ IA Active — clé configurée</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Modèle texte : <span className={`font-mono font-semibold ${ps.text}`}>{currentLang}</span>
                {" · "}Vision : <span className="font-mono font-semibold text-blue-400">{currentVision}</span>
                {config.updatedAt && ` · Mis à jour : ${new Date(config.updatedAt).toLocaleString("fr-FR")}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-red-400 font-bold text-sm">⚠ Aucune clé API configurée</p>
              <p className="text-slate-500 text-xs mt-0.5">Toutes les fonctions IA sont désactivées.</p>
            </>
          )}
        </div>
        {hasKey && (
          <form action={revokeGlobalKey}>
            <button type="submit"
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-colors">
              Révoquer
            </button>
          </form>
        )}
      </div>

      {/* Formulaire */}
      <form action={saveGlobalIaConfig} className="space-y-6">

        {/* Clé API */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🔑 Clé API
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ps.bg} ${ps.text}`}>{ps.label}</span>
            </h2>
            <a href={hint.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
              → Obtenir une clé sur {hint.urlLabel} ↗
            </a>
          </div>
          <input
            name="iaApiKey"
            type="password"
            autoComplete="off"
            placeholder={hasKey ? "••••••••••• (laisser vide pour conserver)" : hint.placeholder}
            className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-slate-600 focus:outline-none transition-colors"
          />
          <p className="text-xs text-slate-600">
            La clé doit correspondre au fournisseur du modèle sélectionné.
            {hasKey && " Laissez le champ vide pour conserver la clé actuelle."}
          </p>
        </div>

        {/* Modèle texte */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">
            🗣️ Modèle texte
            <span className="text-xs font-normal text-slate-400 ml-2">Chatbot · Descriptions · Planning · Défis</span>
          </h2>
          <div className="space-y-2">
            {LANG_MODELS.map(m => {
              const mps = PROVIDER_STYLE[m.provider];
              const isSelected = currentLang === m.id;
              return (
                <label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                }`}>
                  <input type="radio" name="iaLangModel" value={m.id} defaultChecked={isSelected} className="accent-orange-500 w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">{m.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${mps.bg} ${mps.text}`}>{mps.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">{m.tier}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Modèle vision */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">
            👁️ Modèle vision
            <span className="text-xs font-normal text-slate-400 ml-2">Magic Scan · Analyse photo plat · OCR menu</span>
          </h2>
          <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠️ Choisissez un modèle du même fournisseur que le modèle texte pour utiliser la même clé API.
          </p>
          <div className="space-y-2">
            {VISION_MODELS.map(m => {
              const mps = PROVIDER_STYLE[m.provider];
              const isSelected = currentVision === m.id;
              return (
                <label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                }`}>
                  <input type="radio" name="iaVisionModel" value={m.id} defaultChecked={isSelected} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">{m.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${mps.bg} ${mps.text}`}>{mps.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Vision ✓</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <button type="submit"
          className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl transition-colors text-base shadow-lg shadow-orange-500/20">
          💾 Sauvegarder la configuration Nova IA
        </button>
      </form>

    </div>
  );
}
