"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  const [hasKey, setHasKey] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Perplexity
  const [pxKey, setPxKey] = useState("");
  const [pxCurrentKey, setPxCurrentKey] = useState<string | null>(null);
  const [pxHasKey, setPxHasKey] = useState(false);
  const [pxSaving, setPxSaving] = useState(false);
  const [pxMsg, setPxMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pxVisible, setPxVisible] = useState(false);

  // Load current config status
  useEffect(() => {
    fetch("/api/ia-config")
      .then((r) => r.json())
      .then((data) => {
        setHasKey(!!data.hasKey);
        setUpdatedAt(data.updatedAt ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/perplexity-config")
      .then((r) => r.json())
      .then((data) => {
        setPxHasKey(!!data.hasKey);
        setPxCurrentKey(data.key ?? null);
      })
      .catch(() => {});
  }, []);

  async function handleSavePx(e: React.FormEvent) {
    e.preventDefault();
    setPxSaving(true);
    setPxMsg(null);
    try {
      const res = await fetch("/api/perplexity-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: pxKey.trim() || null }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setPxHasKey(!!pxKey.trim());
      if (pxKey.trim()) setPxCurrentKey(pxKey.trim());
      setPxKey("");
      setPxMsg({ type: "ok", text: "Clé Perplexity sauvegardée !" });
    } catch (err: any) {
      setPxMsg({ type: "err", text: err.message });
    } finally {
      setPxSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ia-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ollamaApiKey: apiKey.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setHasKey(true);
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setApiKey("");
      setMessage({ type: "ok", text: "Cle API sauvegardee avec succes !" });
    } catch (err: any) {
      setMessage({ type: "err", text: err.message ?? "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Revoquer la cle API ? Toutes les fonctions IA seront desactivees.")) return;
    setRevoking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ia-config", { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur serveur");
      setHasKey(false);
      setUpdatedAt(null);
      setMessage({ type: "ok", text: "Cle API revoquee." });
    } catch (err: any) {
      setMessage({ type: "err", text: err.message ?? "Erreur inconnue" });
    } finally {
      setRevoking(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/2" />
          <div className="h-32 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-4xl">🦙</span> Nova Connect IA
        </h1>
        <p className="text-slate-400 mt-1">
          Cle API Ollama Cloud globale. Les modeles sont configurables par restaurant
          dans leur fiche individuelle.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl border p-4 text-sm font-semibold ${
          message.type === "ok"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Statut */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
        hasKey ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
      }`}>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${hasKey ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
        <div className="flex-1">
          {hasKey ? (
            <>
              <p className="text-emerald-400 font-bold text-sm">IA Ollama Active</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Cle configuree
                {updatedAt && ` — Mis a jour : ${new Date(updatedAt).toLocaleString("fr-FR")}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-red-400 font-bold text-sm">Aucune cle API configuree</p>
              <p className="text-slate-500 text-xs mt-0.5">Toutes les fonctions IA sont desactivees.</p>
            </>
          )}
        </div>
        {hasKey && (
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {revoking ? "..." : "Revoquer"}
          </button>
        )}
      </div>

      {/* Formulaire cle API */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-white">
              Cle API Ollama Cloud
            </h2>
            <a href="https://ollama.com/settings/keys" target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
              Obtenir une cle sur ollama.com
            </a>
          </div>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            autoComplete="off"
            placeholder={hasKey ? "Laisser vide pour conserver la cle actuelle" : "Collez votre cle API Ollama Cloud ici"}
            className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-slate-600 focus:outline-none transition-colors"
          />
          {hasKey && (
            <p className="text-xs text-slate-600">
              Laissez vide pour garder la cle actuelle. Entrez une nouvelle cle pour la remplacer.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || (!apiKey.trim() && !hasKey)}
          className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl transition-colors text-base shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </form>

      {/* ── Perplexity API ── */}
      <div className="pt-6 border-t border-slate-800">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-1">
          <span className="text-3xl">🔍</span> Perplexity — Sonar
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Clé API Perplexity (modèle <code className="text-orange-400">sonar</code>) — utilisée pour les circuits de prospection automatiques.
        </p>

        {pxMsg && (
          <div className={`rounded-xl border p-4 text-sm font-semibold mb-4 ${
            pxMsg.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}>{pxMsg.text}</div>
        )}

        {/* Statut + affichage de la clé */}
        <div className={`rounded-2xl border p-5 mb-5 flex items-start gap-4 ${
          pxHasKey ? "border-blue-500/30 bg-blue-500/5" : "border-slate-700 bg-slate-900"
        }`}>
          <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${pxHasKey ? "bg-blue-400 animate-pulse" : "bg-slate-600"}`} />
          <div className="flex-1 min-w-0">
            {pxHasKey ? (
              <>
                <p className="text-blue-300 font-bold text-sm">Clé Perplexity configurée ✓</p>
                {pxCurrentKey && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 truncate">
                      {pxVisible ? pxCurrentKey : pxCurrentKey.slice(0, 8) + "•".repeat(20) + pxCurrentKey.slice(-4)}
                    </code>
                    <button
                      type="button"
                      onClick={() => setPxVisible(v => !v)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-2 bg-slate-800 rounded-lg transition-colors"
                    >{pxVisible ? "🙈" : "👁️"}</button>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(pxCurrentKey!); setPxMsg({ type: "ok", text: "Clé copiée !" }); }}
                      className="text-xs text-orange-400 hover:text-orange-300 px-2 py-2 bg-slate-800 rounded-lg transition-colors"
                    >📋</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-slate-400 font-bold text-sm">Aucune clé configurée</p>
                <p className="text-slate-600 text-xs mt-0.5">Les circuits de prospection ne fonctionneront pas sans cette clé.</p>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSavePx} className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Clé API Perplexity</h3>
              <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener"
                className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
                Obtenir une clé sur perplexity.ai →
              </a>
            </div>
            <input
              value={pxKey}
              onChange={(e) => setPxKey(e.target.value)}
              type="password"
              autoComplete="off"
              placeholder={pxHasKey ? "Laisser vide pour garder la clé actuelle" : "pplx-xxxxxxxxxxxxxxxx..."}
              className="w-full bg-black/40 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={pxSaving || (!pxKey.trim() && !pxHasKey)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-colors disabled:opacity-50"
          >
            {pxSaving ? "Sauvegarde..." : "Sauvegarder la clé Perplexity"}
          </button>
        </form>
      </div>

    </div>
  );
}
