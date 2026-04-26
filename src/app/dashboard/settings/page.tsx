import { prisma } from "@/lib/db";
import { saveGlobalIaConfig, revokeGlobalKey } from "@/lib/ia-actions";

export const dynamic = "force-dynamic";

// ── Ollama Cloud Models (fetched from https://ollama.com/api/tags) ────────────
const OLLAMA_LANG_MODELS = [
  { id: "gpt-oss:120b",           label: "GPT-OSS 120B",               tier: "Best",   desc: "Meilleure qualite — recommande par defaut" },
  { id: "gpt-oss:20b",            label: "GPT-OSS 20B",                tier: "Fast",   desc: "Rapide et leger" },
  { id: "deepseek-v4-flash",      label: "DeepSeek V4 Flash",          tier: "Best",   desc: "Dernier modele DeepSeek — rapide, excellent raisonnement" },
  { id: "deepseek-v3.2",          label: "DeepSeek V3.2 671B",         tier: "Best",   desc: "Tres grand modele, excellente qualite" },
  { id: "deepseek-v3.1:671b",     label: "DeepSeek V3.1 671B",         tier: "Best",   desc: "Version stable, haute qualite" },
  { id: "kimi-k2.6",              label: "Kimi K2.6",                   tier: "Best",   desc: "MoE puissant, excellent multi-tache" },
  { id: "qwen3.5:397b",           label: "Qwen 3.5 397B",              tier: "Best",   desc: "Modele Alibaba — fort en raisonnement et code" },
  { id: "qwen3-coder:480b",       label: "Qwen 3 Coder 480B",          tier: "Code",   desc: "Specialise code — excellent pour generation technique" },
  { id: "cogito-2.1:671b",        label: "Cogito 2.1 671B",            tier: "Best",   desc: "Raisonnement avance, grande precision" },
  { id: "gemma4:31b",             label: "Gemma 4 31B (Google)",        tier: "Fast",   desc: "Leger, rapide, Google open-source" },
  { id: "gemma3:27b",             label: "Gemma 3 27B (Google)",        tier: "Fast",   desc: "Rapide et economique" },
  { id: "mistral-large-3:675b",   label: "Mistral Large 3 675B",       tier: "Best",   desc: "Plus grand Mistral — excellent francais" },
  { id: "minimax-m2.7",           label: "MiniMax M2.7",                tier: "Best",   desc: "Grand modele MiniMax — polyvalent" },
  { id: "nemotron-3-super",       label: "Nemotron 3 Super (NVIDIA)",   tier: "Best",   desc: "NVIDIA — excellent suivi d'instructions" },
  { id: "glm-5.1",                label: "GLM 5.1",                     tier: "Best",   desc: "Dernier GLM — tres grand modele" },
];

const OLLAMA_VISION_MODELS = [
  { id: "qwen3-vl:235b",          label: "Qwen 3 VL 235B",             desc: "Meilleure analyse image — recommande pour Magic Scan" },
  { id: "qwen3-vl:235b-instruct", label: "Qwen 3 VL 235B Instruct",   desc: "Version instruct — ideal pour JSON structure" },
  { id: "gemma4:31b",             label: "Gemma 4 31B Vision (Google)", desc: "Vision Google, rapide et precis" },
  { id: "gemma3:27b",             label: "Gemma 3 27B Vision (Google)", desc: "Vision economique Google" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview",     desc: "Preview Google Cloud — rapide" },
];

export default async function AdminSettingsPage() {
  let config: { ollamaApiKey: string | null; ollamaLangModel: string; ollamaVisionModel: string; updatedAt: Date | null } = {
    ollamaApiKey: null, ollamaLangModel: "gpt-oss:120b", ollamaVisionModel: "qwen3-vl:235b", updatedAt: null
  };
  let dbError: string | null = null;

  try {
    // Ensure GlobalConfig table exists (idempotent)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GlobalConfig" (
        id TEXT NOT NULL DEFAULT 'global',
        "ollamaApiKey" TEXT,
        "ollamaLangModel" TEXT NOT NULL DEFAULT 'gpt-oss:120b',
        "ollamaVisionModel" TEXT NOT NULL DEFAULT 'qwen3-vl:235b',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY (id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "GlobalConfig" (id, "ollamaApiKey", "ollamaLangModel", "ollamaVisionModel", "updatedAt")
      VALUES ('global', NULL, 'gpt-oss:120b', 'qwen3-vl:235b', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    const rows = await prisma.$queryRaw<Array<{
      ollamaApiKey: string | null;
      ollamaLangModel: string;
      ollamaVisionModel: string;
      updatedAt: Date;
    }>>`SELECT "ollamaApiKey", "ollamaLangModel", "ollamaVisionModel", "updatedAt" FROM "GlobalConfig" WHERE id = 'global' LIMIT 1`;

    if (rows[0]) config = rows[0];
  } catch (err: any) {
    console.error("[AdminSettings] DB error:", err?.message ?? err);
    dbError = err?.message ?? "Erreur base de donnees inconnue";
  }

  const currentLang   = config.ollamaLangModel   ?? "gpt-oss:120b";
  const currentVision = config.ollamaVisionModel ?? "qwen3-vl:235b";
  const hasKey        = !!config.ollamaApiKey;

  return (
    <div className="p-8 max-w-3xl space-y-8">

      {/* DB Error Banner */}
      {dbError && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
          <p className="text-yellow-400 font-bold text-sm">Avertissement base de donnees</p>
          <p className="text-slate-400 text-xs mt-1 font-mono">{dbError}</p>
          <p className="text-slate-500 text-xs mt-2">La table GlobalConfig a ete creee automatiquement. Rechargez la page.</p>
        </div>
      )}

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
