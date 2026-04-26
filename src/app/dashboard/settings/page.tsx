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
  }, []);

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

    </div>
  );
}
