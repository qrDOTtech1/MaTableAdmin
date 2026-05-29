"use client";
import { useState } from "react";

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  blank: { subject: "", body: "" },
  trial_ending: {
    subject: "Plus que quelques jours d'essai sur MaTable.Pro",
    body: "Bonjour {name},\n\nVotre période d'essai sur MaTable.Pro touche bientôt à sa fin.\nProfitez encore quelques jours de toutes les fonctions Pro — et choisissez un forfait pour continuer sans interruption.\n\nÀ tout de suite,\nL'équipe MaTable.Pro",
  },
  new_feature: {
    subject: "🆕 Nouvelle fonctionnalité sur MaTable.Pro",
    body: "Bonjour {name},\n\nOn vient d'ajouter [nom de la feature] dans votre dashboard. \nDécouvrez-la dès maintenant — ça ne prend que 2 minutes.\n\nBon service,\nL'équipe MaTable.Pro",
  },
  win_back: {
    subject: "On ne vous a pas vu(e) depuis un moment 👋",
    body: "Bonjour {name},\n\nOn a remarqué que vous n'avez pas utilisé MaTable.Pro depuis quelques jours.\nUne question, un blocage ? On est là pour vous aider — répondez à cet email.\n\nÀ très vite,\nL'équipe MaTable.Pro",
  },
};

export function CampaignForm({ segmentLabels }: { segmentLabels: Record<string, string> }) {
  const [segment, setSegment] = useState("trial_active");
  const [from, setFrom] = useState("contact");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  function applyTemplate(key: string) {
    const t = TEMPLATES[key];
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
  }

  async function doPreview() {
    setBusy(true); setResult(null); setPreview(null);
    try {
      const r = await fetch("/api/admin/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, from, subject: subject || "preview", body: body || "preview", dryRun: true }),
      });
      const j = await r.json();
      if (r.ok) setPreview(j.count);
      else setResult(`Erreur : ${j.error}`);
    } finally { setBusy(false); }
  }

  async function doSend() {
    if (!subject || !body) { setResult("Objet et message requis."); return; }
    if (!confirm(`Envoyer à ${preview ?? "?"} restos pour de vrai ?`)) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/admin/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, from, subject, body }),
      });
      const j = await r.json();
      if (r.ok) {
        setResult(`✅ Envoyé à ${j.sentCount} resto(s). ${j.failCount ? `(${j.failCount} échecs)` : ""}`);
        setSubject(""); setBody(""); setPreview(null);
      } else {
        setResult(`Erreur : ${j.error}`);
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Segment</span>
          <select value={segment} onChange={(e) => { setSegment(e.target.value); setPreview(null); }}
            className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {Object.entries(segmentLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Expéditeur</span>
          <div className="mt-1 flex">
            <input value={from} onChange={(e) => setFrom(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-l-lg px-3 py-2 text-sm text-white" />
            <span className="px-3 py-2 rounded-r-lg bg-slate-800 border border-l-0 border-slate-700 text-xs text-slate-400">@matable.pro</span>
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Template</span>
          <select onChange={(e) => applyTemplate(e.target.value)}
            className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="blank">— Choisir —</option>
            <option value="trial_ending">Fin d'essai</option>
            <option value="new_feature">Nouvelle fonctionnalité</option>
            <option value="win_back">Reconquête (inactif)</option>
          </select>
        </label>
      </div>

      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Objet de l'email"
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Corps du message — {name} sera remplacé par le nom du resto."
        rows={9}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={doPreview}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white disabled:opacity-50"
        >
          Compter les destinataires
        </button>
        <button
          onClick={doSend}
          disabled={busy || !subject || !body}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Envoi…" : "Envoyer la campagne"}
        </button>
        {preview !== null && (
          <span className="text-sm text-emerald-400 font-bold">📊 {preview} destinataire(s)</span>
        )}
        {result && <span className="text-sm text-white/70">{result}</span>}
      </div>
    </div>
  );
}
