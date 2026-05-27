"use client";

import { useEffect, useState } from "react";

type Stats = {
  counts: Record<string, number | null>;
  dbSizeBytes: number | null;
  at: string;
};

type Config = {
  backupRecipient: string;
  backupEnabled: boolean;
  backupHourUtc: number;
  lastBackupAt: string | null;
  lastBackupSize: number | null;
  lastBackupTables: number | null;
  lastBackupRows: number | null;
};

const CRITICAL = new Set([
  "Restaurant", "MenuItem", "User", "CustomerReview",
  "Prospect", "PricingRequest", "GeneratedDocument",
  "Server", "Order",
]);

function formatBytes(n: number | null) {
  if (n === null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function DatabaseClient({ initialConfig }: { initialConfig: Config }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [cfg, setCfg] = useState<Config>(initialConfig);
  const [busy, setBusy] = useState<"backup" | "download" | "save" | "send" | "migrate" | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const r = await fetch("/api/database/stats");
      if (r.ok) setStats(await r.json());
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const toast = (text: string, type: "ok" | "err" = "ok") => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const saveConfig = async () => {
    setBusy("save");
    try {
      const r = await fetch("/api/database/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupRecipient: cfg.backupRecipient.trim(),
          backupEnabled: cfg.backupEnabled,
          backupHourUtc: cfg.backupHourUtc,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "save_failed");
      toast("Configuration sauvegardée.");
    } catch (e: any) {
      toast(e.message ?? "Erreur", "err");
    } finally {
      setBusy(null);
    }
  };

  const downloadBackup = async () => {
    setBusy("download");
    try {
      const r = await fetch("/api/database/backup?download=1", { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).reason ?? "fail");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matable-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json.gz`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Backup téléchargé.");
      loadStats();
    } catch (e: any) {
      toast(e.message ?? "Erreur", "err");
    } finally {
      setBusy(null);
    }
  };

  const runMigrations = async () => {
    setBusy("migrate");
    try {
      const r = await fetch("/api/database/migrate", { method: "POST" });
      const data = await r.json();
      const errorCount = Object.keys(data.errors ?? {}).length;
      if (errorCount > 0) {
        toast(`${data.applied.length} migration(s) OK, ${errorCount} erreur(s) : ${Object.values(data.errors).join(", ")}`, "err");
      } else {
        toast(`✓ ${data.applied.length} migration(s) appliquée(s) avec succès.`);
      }
      loadStats();
    } catch (e: any) {
      toast(e.message ?? "Erreur", "err");
    } finally {
      setBusy(null);
    }
  };

  const sendBackupNow = async () => {
    if (!cfg.backupRecipient) { toast("Configurez d'abord un destinataire.", "err"); return; }
    setBusy("send");
    try {
      const r = await fetch("/api/database/backup?email=1", { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.email?.reason ?? data.reason ?? "fail");
      toast(`Backup envoyé à ${cfg.backupRecipient}.`);
      loadStats();
    } catch (e: any) {
      toast(e.message ?? "Erreur", "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-lg border text-sm ${
          msg.type === "ok"
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
            : "bg-red-500/10 text-red-300 border-red-500/30"
        }`}>
          {msg.text}
        </div>
      )}

      {/* État DB */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">📊 État actuel</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats ? `Lecture : ${new Date(stats.at).toLocaleTimeString("fr-FR")}` : "..."}
              {stats?.dbSizeBytes && ` · Taille DB ${formatBytes(stats.dbSizeBytes)}`}
            </p>
          </div>
          <button
            onClick={loadStats}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300"
          >
            🔄 Rafraîchir
          </button>
        </div>
        {loadingStats ? (
          <p className="text-slate-500 text-sm">Chargement…</p>
        ) : !stats ? (
          <p className="text-red-400 text-sm">Erreur de lecture.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(stats.counts).map(([t, n]) => {
              const isCritical = CRITICAL.has(t);
              const absent = n === null;
              return (
                <div
                  key={t}
                  className={`p-2.5 rounded-lg border ${
                    absent ? "bg-red-500/5 border-red-500/30"
                    : isCritical ? "bg-orange-500/5 border-orange-500/30"
                    : "bg-slate-800/40 border-slate-700/50"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t}</p>
                  <p className={`text-xl font-black ${absent ? "text-red-400" : "text-white"}`}>
                    {absent ? "absente" : (n ?? 0).toLocaleString("fr-FR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Migrations */}
      <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-white">🔧 Migrations base de données</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Applique les migrations SQL non-destructives (<code className="text-blue-400">IF NOT EXISTS</code>).
              Idempotent — peut être relancé plusieurs fois sans risque. Exécuté automatiquement par le cron daily-backup.
            </p>
          </div>
          <button
            onClick={runMigrations}
            disabled={busy === "migrate"}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {busy === "migrate" ? "En cours…" : "▶ Lancer les migrations"}
          </button>
        </div>
        <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3 text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-300">Migrations déclarées :</p>
          <p>• <code className="text-blue-300">add_reservable_to_table</code> — <code>Table.reservable BOOLEAN DEFAULT true</code></p>
          <p>• <code className="text-blue-300">create_zone_config</code> — table <code>ZoneConfig</code> (quotas walk-in par zone)</p>
          <p>• <code className="text-blue-300">create_zone_config_idx</code> — index <code>ZoneConfig.restaurantId</code></p>
          <p>• <code className="text-blue-300">create_loyalty_customer</code> — table <code>LoyaltyCustomer</code> (programme fidélité)</p>
          <p>• <code className="text-blue-300">create_loyalty_offer</code> — table <code>LoyaltyOffer</code> (récompenses)</p>
          <p>• <code className="text-blue-300">create_loyalty_transaction</code> — table <code>LoyaltyTransaction</code> (historique points)</p>
          <p>• <code className="text-blue-300">add_reservation_alert_email</code> — <code>Restaurant.reservationAlertEmail TEXT</code></p>
          <p>• <code className="text-blue-300">create_loyalty_config</code> — table <code>LoyaltyConfig</code> (config points/€, seuil min)</p>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">💾 Backup quotidien</h2>
        <p className="text-xs text-slate-500 mb-4">
          Export JSON gzipé des tables critiques (Restaurant, MenuItem, CustomerReview, etc.) envoyé par email.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Destinataire</label>
            <input
              type="email"
              value={cfg.backupRecipient}
              onChange={e => setCfg(c => ({ ...c, backupRecipient: e.target.value }))}
              placeholder="vous@exemple.fr"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={cfg.backupEnabled}
                onChange={e => setCfg(c => ({ ...c, backupEnabled: e.target.checked }))}
                className="accent-orange-500"
              />
              Activer l'envoi quotidien automatique
            </label>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <span>à</span>
              <input
                type="number"
                min={0} max={23}
                value={cfg.backupHourUtc}
                onChange={e => setCfg(c => ({ ...c, backupHourUtc: Math.max(0, Math.min(23, Number(e.target.value) || 0)) }))}
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-100"
              />
              <span>h UTC</span>
            </div>
            <button
              onClick={saveConfig}
              disabled={busy === "save"}
              className="ml-auto px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {busy === "save" ? "…" : "Sauvegarder"}
            </button>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs text-slate-500 mb-2">Dernier backup :</p>
            {cfg.lastBackupAt ? (
              <div className="text-sm text-slate-300 flex items-center gap-4 flex-wrap">
                <span><b>{new Date(cfg.lastBackupAt).toLocaleString("fr-FR")}</b></span>
                <span className="text-slate-500">·</span>
                <span>{formatBytes(cfg.lastBackupSize)}</span>
                <span className="text-slate-500">·</span>
                <span>{cfg.lastBackupTables} tables</span>
                <span className="text-slate-500">·</span>
                <span>{cfg.lastBackupRows?.toLocaleString("fr-FR")} lignes</span>
              </div>
            ) : (
              <p className="text-sm text-amber-400">Aucun backup encore réalisé.</p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap pt-2">
            <button
              onClick={downloadBackup}
              disabled={!!busy}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {busy === "download" ? "Génération…" : "⬇ Télécharger un backup maintenant"}
            </button>
            <button
              onClick={sendBackupNow}
              disabled={!!busy || !cfg.backupRecipient}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {busy === "send" ? "Envoi…" : "✉ Envoyer maintenant à " + (cfg.backupRecipient || "...")}
            </button>
          </div>
        </div>
      </div>

      {/* Procédure de cron */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">⏰ Planification automatique</h2>
        <p className="text-xs text-slate-500 mb-3">
          Pour que le backup tourne tous les jours sans intervention, configurez un cron externe qui ping ce endpoint :
        </p>
        <pre className="text-xs bg-black/40 border border-slate-700 rounded p-3 text-slate-300 overflow-x-auto">
{`GET https://<votre-domaine-admin>/api/cron/daily-backup
Header : User-Agent: cron-job.org`}
        </pre>
        <p className="text-xs text-slate-500 mt-2">
          Recommandé : <a href="https://cron-job.org" target="_blank" className="text-orange-400 underline">cron-job.org</a> (gratuit, fiable). Programmez-le tous les jours à <b>{cfg.backupHourUtc}h00 UTC</b>.
        </p>
      </div>

      {/* Persistance */}
      <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-5">
        <h2 className="text-lg font-bold text-emerald-300 mb-2">🛡 Persistance des données client</h2>
        <ul className="text-sm text-slate-300 space-y-1.5">
          <li>✓ Plus aucun <code className="text-emerald-400">prisma db push</code> automatique au boot</li>
          <li>✓ Migrations via SQL idempotent (<code className="text-emerald-400">ensure_columns.sql</code>) uniquement</li>
          <li>✓ Backups quotidiens par email (configurés ci-dessus)</li>
          <li>✓ Détection visuelle des tables absentes (encart rouge si une table critique disparaît)</li>
        </ul>
      </div>
    </div>
  );
}
