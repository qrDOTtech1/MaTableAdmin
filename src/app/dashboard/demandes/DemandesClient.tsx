"use client";

import { useState, useMemo } from "react";

type Req = {
  id: string;
  status: string;
  restaurantName: string;
  managerName: string;
  email: string;
  phone: string | null;
  city: string | null;
  selectedModules: string[];
  engagement: string;
  monthlyHtCents: number;
  totalHtCents: number;
  volumePercent: number;
  message: string | null;
  sourceUrl: string | null;
  convertedRestaurantId: string | null;
  convertedAt: string | null;
  createdAt: string;
};

const MODULE_NAMES: Record<string, string> = {
  avis: "Avis Google", qr: "Commande & Paiement", server: "Portail Serveur",
  stock: "Nova Stock IA", finance: "Nova Finance IA", contab: "Nova Contab IA",
  reservations: "Réservations",
};

const ENGAGEMENT_LABEL: Record<string, string> = {
  "3m": "3 mois", "6m": "6 mois", "9m": "9 mois",
  "12m": "12 mois", "12a": "12 mois (annuel)",
};

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  CONTACTED: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  CONVERTED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  REJECTED: "bg-red-500/20 text-red-300 border-red-500/40",
};

function eur(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default function DemandesClient({ requests: initial }: { requests: Req[] }) {
  const [requests, setRequests] = useState(initial);
  const [filter, setFilter] = useState<string>("ALL");
  const [open, setOpen] = useState<Req | null>(null);

  const filtered = useMemo(
    () => requests.filter((r) => filter === "ALL" || r.status === filter),
    [requests, filter]
  );

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/pricing-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRequests((all) => all.map((r) => (r.id === id ? { ...r, status } : r)));
      if (open?.id === id) setOpen({ ...open, status });
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Supprimer définitivement cette demande ?")) return;
    const res = await fetch(`/api/pricing-requests/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRequests((all) => all.filter((r) => r.id !== id));
      if (open?.id === id) setOpen(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "NEW", "CONTACTED", "CONVERTED", "REJECTED"].map((s) => {
          const count = s === "ALL" ? requests.length : requests.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === s
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
              }`}
            >
              {s === "ALL" ? "Toutes" : s} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Établissement</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-center">Modules</th>
              <th className="px-4 py-3 text-left">Engagement</th>
              <th className="px-4 py-3 text-right">HT/mois</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Aucune demande.</td></tr>
            ) : filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => setOpen(r)}
                className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${STATUS_STYLES[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-100 font-bold">
                  {r.restaurantName}
                  {r.city && <span className="text-slate-500 font-normal text-xs ml-2">· {r.city}</span>}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {r.managerName}
                  <br/><span className="text-xs text-slate-500">{r.email}</span>
                </td>
                <td className="px-4 py-3 text-center text-slate-300">{r.selectedModules.length}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{ENGAGEMENT_LABEL[r.engagement] ?? r.engagement}</td>
                <td className="px-4 py-3 text-right text-orange-400 font-bold">{eur(r.monthlyHtCents)}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal détail */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${STATUS_STYLES[open.status] ?? ""}`}>
                  {open.status}
                </span>
                <h2 className="text-2xl font-black text-white mt-2">{open.restaurantName}</h2>
                <p className="text-sm text-slate-400">
                  Demande reçue le {new Date(open.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <button onClick={() => setOpen(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
            </div>

            {/* Coordonnées */}
            <div className="bg-slate-800 rounded-lg p-3 mb-4 text-sm space-y-1">
              <p><span className="text-slate-400">Contact :</span> <b className="text-white">{open.managerName}</b></p>
              <p>
                <span className="text-slate-400">Email :</span>{" "}
                <a href={`mailto:${open.email}`} className="text-orange-400 hover:underline">{open.email}</a>
              </p>
              {open.phone && (
                <p>
                  <span className="text-slate-400">Téléphone :</span>{" "}
                  <a href={`tel:${open.phone}`} className="text-orange-400 hover:underline">{open.phone}</a>
                </p>
              )}
              {open.city && <p><span className="text-slate-400">Ville :</span> <span className="text-white">{open.city}</span></p>}
            </div>

            {/* Modules + tarification */}
            <div className="bg-slate-800 rounded-lg p-3 mb-4 text-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Configuration demandée</p>
              <div className="space-y-1.5 mb-3">
                {open.selectedModules.map((id) => (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-white">{MODULE_NAMES[id] ?? id}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-700 pt-2 space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Engagement</span>
                  <b>{ENGAGEMENT_LABEL[open.engagement] ?? open.engagement}</b>
                </div>
                {open.volumePercent > 0 && (
                  <div className="flex justify-between text-emerald-400 text-xs">
                    <span>Remise volume</span><span>-{open.volumePercent} %</span>
                  </div>
                )}
                <div className="flex justify-between text-orange-400 font-black text-lg">
                  <span>HT/mois</span><span>{eur(open.monthlyHtCents)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Total période</span><span>{eur(open.totalHtCents)}</span>
                </div>
              </div>
            </div>

            {open.message && (
              <div className="bg-slate-800 rounded-lg p-3 mb-4 text-sm">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Message</p>
                <p className="text-slate-200 whitespace-pre-wrap">{open.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              {open.status === "NEW" && (
                <button
                  onClick={() => updateStatus(open.id, "CONTACTED")}
                  className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-sm font-semibold"
                >
                  📞 Marquer contacté
                </button>
              )}
              {(open.status === "NEW" || open.status === "CONTACTED") && (
                <>
                  <button
                    onClick={() => updateStatus(open.id, "CONVERTED")}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-sm font-semibold"
                  >
                    ✓ Marquer converti
                  </button>
                  <button
                    onClick={() => updateStatus(open.id, "REJECTED")}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-sm font-semibold"
                  >
                    ✕ Rejeter
                  </button>
                </>
              )}
              <a
                href={`mailto:${open.email}?subject=Votre demande MaTable.Pro — ${encodeURIComponent(open.restaurantName)}`}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold ml-auto"
              >
                ✉ Répondre par email
              </a>
              <button
                onClick={() => deleteRequest(open.id)}
                className="px-4 py-2 text-red-400 hover:text-red-300 text-sm"
              >
                🗑 Supprimer
              </button>
            </div>

            <p className="text-xs text-slate-500 italic mt-4">
              💡 Pour générer un contrat depuis cette demande : créez d'abord un Restaurant
              (Dashboard → Restaurateurs → Ajouter), puis ouvrez sa fiche Documents en
              recopiant les modules sélectionnés ci-dessus.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
