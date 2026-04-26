import { prisma } from "@/lib/db";
import { saveGlobalIaConfig, revokeGlobalKey } from "@/lib/ia-actions";

export const dynamic = "force-dynamic";

// ── Ollama Cloud Models ──────────────────────────────────────────────────────
const OLLAMA_LANG_MODELS = [
  { id: "gpt-oss:120b-cloud",    label: "GPT-OSS 120B Cloud",    tier: "Best",      desc: "Meilleure qualité — recommandé par défaut" },
  { id: "gpt-oss:70b-cloud",     label: "GPT-OSS 70B Cloud",     tier: "Fast $",    desc: "Rapide et économique" },
  { id: "gpt-4o-cloud",          label: "GPT-4o Cloud",          tier: "Best",      desc: "Excellent multimodal" },
  { id: "llama3.1:latest-cloud", label: "Llama 3.1 Cloud",       tier: "Fast $",    desc: "Léger et rapide" },
];

const OLLAMA_VISION_MODELS = [
  { id: "gpt-4o-cloud",       label: "GPT-4o Vision Cloud",       desc: "Meilleure analyse image — recommandé pour Magic Scan" },
  { id: "llava:latest-cloud", label: "LLaVA Vision Cloud",        desc: "Vision qualité, économique" },
];

export default async function AdminSettingsPage() {
  const rows = await prisma.$queryRaw<Array<{
    ollamaApiKey: string | null;
    ollamaLangModel: string;
    ollamaVisionModel: string;
    updatedAt: Date;
  }>>`SELECT "ollamaApiKey", "ollamaLangModel", "ollamaVisionModel", "updatedAt" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1`;

  const config = rows[0] ?? { ollamaApiKey: null, ollamaLangModel: "gpt-oss:120b-cloud", ollamaVisionModel: "gpt-4o-cloud", updatedAt: null };

  const currentLang   = config.ollamaLangModel   ?? "gpt-oss:120b-cloud";
  const currentVision = config.ollamaVisionModel ?? "gpt-4o-cloud";
  const hasKey        = !!config.ollamaApiKey;

  return (
    <div className="p-8 max-w-3xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-4xl">🦙</span> Nova Connect IA — Ollama Cloud
        </h1>
        <p className="text-slate-400 mt-1">
          Une seule clé API Ollama Cloud, utilisée automatiquement par{" "}
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
              <p className="text-emerald-400 font-bold text-sm">✓ IA Ollama Active — clé configurée</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Modèle texte : <span className="font-mono font-semibold text-emerald-400">{currentLang}</span>
                {" · "}Vision : <span className="font-mono font-semibold text-emerald-400">{currentVision}</span>
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

        {/* Clé API Ollama Cloud */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🔑 Clé API Ollama Cloud
            </h2>
            <a href="https://ollama.com/settings/keys" target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
              → Obtenir une clé sur ollama.com ↗
            </a>
          </div>
          <input
            name="ollamaApiKey"
            type="password"
            autoComplete="off"
            placeholder={hasKey ? "••••••••••• (laisser vide pour conserver)" : "Votre clé API Ollama Cloud"}
            className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-slate-600 focus:outline-none transition-colors"
          />
          <p className="text-xs text-slate-600">
            Créez ou récupérez votre clé API sur https://ollama.com/settings/keys
            {hasKey && " Laissez le champ vide pour conserver la clé actuelle."}
          </p>
        </div>

        {/* Modèle texte */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">
            🗣️ Modèle texte (Ollama Cloud)
            <span className="text-xs font-normal text-slate-400 ml-2">Chatbot · Descriptions · Planning · Défis</span>
          </h2>
          <div className="space-y-2">
            {OLLAMA_LANG_MODELS.map(m => {
              const isSelected = currentLang === m.id;
              return (
                <label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                }`}>
                  <input type="radio" name="ollamaLangModel" value={m.id} defaultChecked={isSelected} className="accent-orange-500 w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">{m.label}</span>
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
            👁️ Modèle vision (Ollama Cloud)
            <span className="text-xs font-normal text-slate-400 ml-2">Magic Scan · Analyse photo plat · OCR menu</span>
          </h2>
          <div className="space-y-2">
            {OLLAMA_VISION_MODELS.map(m => {
              const isSelected = currentVision === m.id;
              return (
                <label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                }`}>
                  <input type="radio" name="ollamaVisionModel" value={m.id} defaultChecked={isSelected} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">{m.label}</span>
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
          💾 Sauvegarder la configuration Ollama Cloud
        </button>
      </form>

    </div>
  );
}
