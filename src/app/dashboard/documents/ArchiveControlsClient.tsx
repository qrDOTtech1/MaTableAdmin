"use client";

import { useState } from "react";

type Initial = {
  archiveRecipient: string;
  archiveEnabled: boolean;
  archiveDayOfMonth: number;
};

export default function ArchiveControlsClient({ initial }: { initial: Initial }) {
  const [recipient, setRecipient] = useState(initial.archiveRecipient);
  const [enabled, setEnabled] = useState(initial.archiveEnabled);
  const [day, setDay] = useState(initial.archiveDayOfMonth);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [open, setOpen] = useState(false);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archiveRecipient: recipient.trim(),
          archiveEnabled: enabled,
          archiveDayOfMonth: day,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setMsg({ type: "ok", text: "Configuration sauvegardée." });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message ?? "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  async function sendNow(force = false) {
    if (!confirm(force
      ? "Renvoyer l'archive du mois écoulé (même les docs déjà archivés) ?"
      : "Envoyer maintenant l'archive du mois écoulé ?")) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/cron/monthly-archive${force ? "?force=1" : ""}`, { method: "POST" });
      const data = await res.json();
      if (data.ok && data.sent) {
        setMsg({ type: "ok", text: `Archive envoyée à ${data.recipient} (${data.documents} doc).` });
      } else if (data.ok && !data.sent) {
        setMsg({ type: "err", text: `Pas d'envoi : ${data.reason}` });
      } else {
        setMsg({ type: "err", text: data.reason ?? data.error ?? "Erreur" });
      }
    } catch (e: any) {
      setMsg({ type: "err", text: e.message ?? "Erreur" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full max-w-md">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center justify-between"
      >
        <span className="font-bold text-slate-100">📧 Archive mensuelle automatique</span>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Destinataire</label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="archive@exemple.fr"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-orange-500"
              />
              Activer l'envoi automatique
            </label>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jour du mois (1-28)</label>
            <input
              type="number"
              min={1} max={28}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
            <span className="ml-2 text-xs text-slate-500">à 9h00 UTC</span>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "..." : "Sauvegarder"}
            </button>
            <button
              onClick={() => sendNow(false)}
              disabled={sending || !enabled || !recipient}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
              title={!enabled || !recipient ? "Activez et configurez d'abord le destinataire" : ""}
            >
              {sending ? "..." : "Envoyer maintenant"}
            </button>
          </div>
          <button
            onClick={() => sendNow(true)}
            disabled={sending}
            className="w-full text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Forcer le ré-envoi (inclut docs déjà archivés)
          </button>
          {msg && (
            <div className={`text-xs font-semibold p-2 rounded-lg ${
              msg.type === "ok"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}>
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
