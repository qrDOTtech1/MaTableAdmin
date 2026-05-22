"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  plaquette: "Plaquette",
  "plaquette-eco": "Plaq. éco",
  "plaquette-premium": "Plaq. premium",
  "plaquette-compact": "Plaq. A5",
  "plaquette-chaine": "Plaq. Chaîne",
  "devis-chaine": "Devis Chaîne",
  flyer: "Flyer",
  "tuto-avis": "Tuto Avis",
  "tuto-commande": "Tuto Menu QR",
  "tuto-avis-eco": "Tuto Avis Éco",
  "plaquette-avis-focus": "Plaq. Avis",
  "plaquette-menu-focus": "Plaq. Menu QR",
  "tuto-reservations": "Tuto Réservations",
  "tuto-reservations-eco": "Tuto Résa Éco",
  "tuto-nova-ia": "Tuto Nova IA",
  "collab-commission": "Collab. Commissionné",
  "collab-horaire": "Collab. Horaire",
  "collab-mixte": "Collab. Mixte",
  "collab-commission-junior": "Collab. Commission Junior",
  "collab-horaire-junior": "Collab. Horaire Junior",
  "collab-mixte-junior": "Collab. Mixte Junior",
  "collab-comptable": "Prestation Comptable",
};

const TYPE_COLORS: Record<string, string> = {
  contrat: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  prestation: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  devis: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  facture: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cgvu: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  onboarding: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  tarification: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  plaquette: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
  "plaquette-eco": "bg-lime-500/10 text-lime-400 border-lime-500/30",
  "plaquette-premium": "bg-violet-500/10 text-violet-400 border-violet-500/30",
  "plaquette-compact": "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "plaquette-chaine": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "devis-chaine": "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  flyer: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "tuto-avis": "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "tuto-commande": "bg-sky-500/10 text-sky-400 border-sky-500/30",
  "tuto-avis-eco": "bg-slate-500/10 text-slate-400 border-slate-500/30",
  "plaquette-avis-focus": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "plaquette-menu-focus": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "tuto-reservations": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "tuto-reservations-eco": "bg-gray-500/10 text-gray-400 border-gray-500/30",
  "tuto-nova-ia": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "collab-commission": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "collab-horaire": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "collab-mixte": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "collab-commission-junior": "bg-violet-500/10 text-violet-400 border-violet-500/30",
  "collab-horaire-junior": "bg-violet-500/10 text-violet-400 border-violet-500/30",
  "collab-mixte-junior": "bg-violet-500/10 text-violet-400 border-violet-500/30",
  "collab-comptable": "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Tous les types disponibles pour la création
const ALL_DOC_TYPES: { group: string; options: { value: string; label: string }[] }[] = [
  { group: "Contrats & Facturation", options: [
    { value: "contrat", label: "Contrat d'abonnement" },
    { value: "prestation", label: "Contrat de prestation" },
    { value: "devis", label: "Devis" },
    { value: "devis-chaine", label: "Devis Chaîne / Groupe" },
    { value: "facture", label: "Facture" },
  ]},
  { group: "Documents légaux & internes", options: [
    { value: "cgvu", label: "CGV / CGU" },
    { value: "onboarding", label: "Fiche Onboarding" },
    { value: "tarification", label: "Fiche Tarification & Suivi" },
  ]},
  { group: "Commercial", options: [
    { value: "plaquette", label: "Plaquette Standard A4" },
    { value: "plaquette-eco", label: "Plaquette Éco encre" },
    { value: "plaquette-premium", label: "Plaquette Premium" },
    { value: "plaquette-compact", label: "Plaquette Compacte A5" },
    { value: "plaquette-chaine", label: "Plaquette Chaîne" },
    { value: "plaquette-avis-focus", label: "Plaquette Avis Google (1p)" },
    { value: "plaquette-menu-focus", label: "Plaquette Menu QR (1p)" },
    { value: "flyer", label: "Flyer démo" },
    { value: "tuto-avis", label: "Tuto Avis Google (3 pages)" },
    { value: "tuto-avis-eco", label: "Tuto Avis — Éco encre (1p)" },
  ]},
  { group: "Fiches tuto opérationnelles", options: [
    { value: "tuto-commande", label: "Tuto Menu QR (2p N&B)" },
    { value: "tuto-reservations", label: "Tuto Réservations (2p couleur)" },
    { value: "tuto-reservations-eco", label: "Tuto Réservations — Éco encre (1p)" },
    { value: "tuto-nova-ia", label: "Tuto Nova IA (1p éco)" },
  ]},
  { group: "Contrats Collaborateurs", options: [
    { value: "collab-commission", label: "Collaborateur — Commissionné (adulte)" },
    { value: "collab-horaire", label: "Collaborateur — Horaire (adulte)" },
    { value: "collab-mixte", label: "Collaborateur — Mixte commission + horaire (adulte)" },
    { value: "collab-commission-junior", label: "Collaborateur — Commissionné Mineur 16+" },
    { value: "collab-horaire-junior", label: "Collaborateur — Horaire Mineur 16+" },
    { value: "collab-mixte-junior", label: "Collaborateur — Mixte Mineur 16+" },
    { value: "collab-comptable", label: "Contrat Prestation Comptable" },
  ]},
];

export default function DocumentsListClient({
  documents,
  hideRestaurantColumn = false,
}: {
  documents: Doc[];
  hideRestaurantColumn?: boolean;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(documents);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "folders">(hideRestaurantColumn ? "list" : "folders");
  const [openClients, setOpenClients] = useState<Record<string, boolean>>({});

  // ── Modal "+ Nouveau document" ──────────────────────────────────────────────
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRestaurantId, setNewRestaurantId] = useState("");
  const [newDocTypeVal, setNewDocTypeVal] = useState("contrat");
  // Liste des restaurants déduite des docs existants + fetch API
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!showNewModal) return;
    // Construire la liste depuis les docs déjà chargés (pas d'appel API)
    const seen = new Map<string, string>();
    for (const d of docs) {
      if (d.restaurantId && d.restaurantName && !seen.has(d.restaurantId)) {
        seen.set(d.restaurantId, d.restaurantName);
      }
    }
    setRestaurants(Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
    if (seen.size > 0 && !newRestaurantId) setNewRestaurantId(Array.from(seen.keys())[0]);
  }, [showNewModal]);

  const handleCreateDoc = () => {
    if (!newRestaurantId) return;
    router.push(`/dashboard/restaurants/${newRestaurantId}/documents?docType=${newDocTypeVal}`);
  };

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

  // Groupement par client (pour la vue "Dossiers")
  const byClient = useMemo(() => {
    const groups = new Map<string, { name: string; docs: Doc[]; total: number }>();
    for (const d of filtered) {
      const key = d.restaurantId || "_orphan";
      if (!groups.has(key)) groups.set(key, { name: d.restaurantName || "—", docs: [], total: 0 });
      const g = groups.get(key)!;
      g.docs.push(d);
      g.total += d.totalCents;
    }
    return Array.from(groups.entries())
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

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
      {/* Filtres + toggle vue */}
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
        {!hideRestaurantColumn && (
          <div className="flex bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
            <button
              onClick={() => setView("folders")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${view === "folders" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              📁 Dossiers
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${view === "list" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              ☰ Liste
            </button>
          </div>
        )}
        <div className="text-xs text-slate-500">
          <b className="text-slate-300">{totals.count}</b> doc{totals.count > 1 ? "s" : ""} ·
          Total HT : <b className="text-orange-400">{euros(totals.sum)}</b>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="ml-auto shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors"
        >
          + Nouveau document
        </button>
      </div>

      {/* ── Modal Nouveau document ── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">Nouveau document</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-200 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Restaurant / Client</label>
                {restaurants.length > 0 ? (
                  <select
                    value={newRestaurantId}
                    onChange={(e) => setNewRestaurantId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  >
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">Aucun client trouvé. Créez d'abord un restaurant.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type de document</label>
                <select
                  value={newDocTypeVal}
                  onChange={(e) => setNewDocTypeVal(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                >
                  {ALL_DOC_TYPES.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateDoc}
                disabled={!newRestaurantId}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Créer →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vue Dossiers : un dossier par client */}
      {view === "folders" && !hideRestaurantColumn && (
        <div className="space-y-3">
          {byClient.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              Aucun document. Créez-en un depuis la fiche d'un restaurant.
            </div>
          ) : byClient.map((group) => {
            const open = !!openClients[group.id];
            return (
              <div key={group.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenClients((s) => ({ ...s, [group.id]: !s[group.id] }))}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{open ? "📂" : "📁"}</span>
                    <div>
                      <div className="font-bold text-slate-100">{group.name}</div>
                      <div className="text-xs text-slate-500">
                        {group.docs.length} document{group.docs.length > 1 ? "s" : ""} ·
                        Total HT : <b className="text-orange-400">{euros(group.total)}</b>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/restaurants/${group.id}/documents`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded-lg font-semibold"
                    >
                      + Nouveau
                    </Link>
                    <span className="text-slate-500">{open ? "▾" : "▸"}</span>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left">N°</th>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-left">Titre</th>
                          <th className="px-4 py-2 text-right">Montant HT</th>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-center">Signé</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.docs.map((d) => (
                          <tr
                            key={d.id}
                            onClick={() => router.push(`/dashboard/documents/${d.id}`)}
                            className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                          >
                            <td className="px-4 py-2.5 font-mono text-slate-300">{d.number}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-1 rounded text-xs font-semibold border ${TYPE_COLORS[d.type] ?? ""}`}>
                                {TYPE_LABELS[d.type] ?? d.type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-300 max-w-md truncate">{d.title}</td>
                            <td className="px-4 py-2.5 text-right text-slate-200 font-semibold">
                              {d.totalCents > 0 ? euros(d.totalCents) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 text-xs">
                              {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {d.signedAt ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">○</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs text-orange-400 hover:text-orange-300">
                              Ouvrir →
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table — vue Liste plate */}
      {(view === "list" || hideRestaurantColumn) && (
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
              <tr
                key={d.id}
                onClick={() => router.push(`/dashboard/documents/${d.id}`)}
                className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer"
              >
                <td className="px-4 py-3 font-mono text-slate-300">{d.number}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${TYPE_COLORS[d.type] ?? ""}`}>
                    {TYPE_LABELS[d.type] ?? d.type}
                  </span>
                </td>
                {!hideRestaurantColumn && (
                  <td className="px-4 py-3 text-slate-200">
                    <Link
                      href={`/dashboard/restaurants/${d.restaurantId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-orange-400"
                    >
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
                    onClick={(e) => { e.stopPropagation(); toggleSigned(d); }}
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
                    onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
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
      )}
    </div>
  );
}
