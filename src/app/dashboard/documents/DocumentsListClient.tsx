"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Doc = {
  id: string;
  number: string;
  type: string;
  title: string;
  totalCents: number;
  createdAt: string;
  signedAt: string | null;
  archivedInMonth: string | null;
  restaurantName: string;
  restaurantId: string;
};

const TYPE_LABELS: Record<string, string> = {
  contrat: "Contrat",
  prestation: "Prestation",
  devis: "Devis",
  facture: "Facture",
  cgvu: "CGV/CGU",
  onboarding: "Onboarding",
  tarification: "Tarification",
};

const TYPE_COLORS: Record<string, string> = {
  contrat: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  prestation: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  devis: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  facture: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cgvu: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  onboarding: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  tarification: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default function DocumentsListClient({
  documents,
  hideRestaurantColumn = false,
}: {
  documents: Doc[];
  hideRestaurantColumn?: boolean;
}) {
  const [docs, setDocs] = useState(documents);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (filter !== "all" && d.type !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!d.number.toLowerCase().includes(s) && !d.title.toLowerCase().includes(s) && !d.restaurantName.toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [docs, filter, search]);

  const totals = useMemo(() => {
    const sum = filtered.reduce((acc, d) => acc + d.totalCents, 0);
    return { count: filtered.length, sum };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce document ?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) setDocs((d) => d.filter((x) => x.id !== id));
    else alert("Erreur lors de la suppression");
  };

  const toggleSigned = async (doc: Doc) => {
    const newSigned = doc.signedAt ? null : new Date().toISOString();
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedAt: newSigned }),
    });
    if (res.ok) {
      setDocs((all) => all.map((x) => (x.id === doc.id ? { ...x, signedAt: newSigned } : x)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-3 flex-wrap items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="Rechercher (n°, titre, client)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="text-xs text-slate-500">
          <b className="text-slate-300">{totals.count}</b> doc{totals.count > 1 ? "s" : ""} ·
          Total HT : <b className="text-orange-400">{euros(totals.sum)}</b>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">N°</th>
              <th className="px-4 py-3 text-left">Type</th>
              {!hideRestaurantColumn && <th className="px-4 py-3 text-left">Client</th>}
              <th className="px-4 py-3 text-left">Titre</th>
              <th className="px-4 py-3 text-right">Montant HT</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Signé</th>
              <th className="px-4 py-3 text-center">Archive</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Aucun document.</td></tr>
            ) : filtered.map((d) => (
              <tr key={d.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                <td className="px-4 py-3 font-mono text-slate-300">{d.number}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${TYPE_COLORS[d.type] ?? ""}`}>
                    {TYPE_LABELS[d.type] ?? d.type}
                  </span>
                </td>
                {!hideRestaurantColumn && (
                  <td className="px-4 py-3 text-slate-200">
                    <Link href={`/dashboard/restaurants/${d.restaurantId}`} className="hover:text-orange-400">
                      {d.restaurantName}
                    </Link>
                  </td>
                )}
                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{d.title}</td>
                <td className="px-4 py-3 text-right text-slate-200 font-semibold">
                  {d.totalCents > 0 ? euros(d.totalCents) : "—"}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleSigned(d)}
                    className={`text-lg ${d.signedAt ? "text-emerald-400" : "text-slate-600 hover:text-slate-400"}`}
                    title={d.signedAt ? `Signé le ${new Date(d.signedAt).toLocaleDateString("fr-FR")}` : "Marquer comme signé"}
                  >
                    {d.signedAt ? "✓" : "○"}
                  </button>
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500">
                  {d.archivedInMonth ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
