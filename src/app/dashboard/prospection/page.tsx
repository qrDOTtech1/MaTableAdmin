"use client";
import { useEffect, useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ProspectStatus = "NEW" | "CONTACTED" | "ACTIVATED" | "IGNORED";

interface Prospect {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  website?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  status: ProspectStatus;
  restaurantId?: string | null;
  notes?: string | null;
  activatedAt?: string | null;
  createdAt: string;
}

interface Stats {
  NEW: number;
  CONTACTED: number;
  ACTIVATED: number;
  IGNORED: number;
}

interface ApiResponse {
  prospects: Prospect[];
  total: number;
  pages: number;
  page: number;
  stats: Stats;
  cities: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string; border: string }> = {
  NEW:       { label: "Nouveau",    color: "text-blue-300",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  CONTACTED: { label: "Contacté",   color: "text-yellow-300", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  ACTIVATED: { label: "Activé ✓",   color: "text-emerald-300",bg: "bg-emerald-500/10",border: "border-emerald-500/30" },
  IGNORED:   { label: "Ignoré",     color: "text-slate-500",  bg: "bg-slate-800",     border: "border-slate-700" },
};

const PLAN_PRICES: Record<string, string> = {
  STARTER: "STARTER — 49,99€/mois",
  PRO:     "PRO — 139,99€/mois",
  PRO_IA:  "PRO_IA — 299€/mois",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProspectionPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Prospect | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const searchTimeout = useRef<any>(null);

  // Activation modal
  const [activating, setActivating] = useState(false);
  const [activateEmail, setActivateEmail] = useState("");
  const [activatePlan, setActivatePlan] = useState("STARTER");
  const [activateResult, setActivateResult] = useState<{ credentials: { email: string; password: string; loginUrl: string } } | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activateLoading, setActivateLoading] = useState(false);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (opts?: { search?: string; status?: string; city?: string; page?: number }) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (opts?.search) params.set("search", opts.search);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.city) params.set("city", opts.city);
    params.set("page", String(opts?.page ?? 1));

    const res = await fetch(`/api/prospects?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData({ search, status: statusFilter, city: cityFilter, page });
  }, [statusFilter, cityFilter, page, fetchData]);

  // Debounce search
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchData({ search: v, status: statusFilter, city: cityFilter, page: 1 });
    }, 350);
  };

  // ── Status update ────────────────────────────────────────────────────────
  async function updateStatus(prospect: Prospect, status: ProspectStatus) {
    await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSelected((s) => s ? { ...s, status } : s);
    fetchData({ search, status: statusFilter, city: cityFilter, page });
  }

  // ── Save notes ───────────────────────────────────────────────────────────
  async function saveNotes() {
    if (!selected) return;
    await fetch(`/api/prospects/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesValue }),
    });
    setSelected((s) => s ? { ...s, notes: notesValue } : s);
    setEditingNotes(false);
  }

  // ── Activate ─────────────────────────────────────────────────────────────
  async function handleActivate() {
    if (!selected || !activateEmail) return;
    setActivateLoading(true);
    setActivateError(null);
    try {
      const res = await fetch(`/api/prospects/${selected.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activateEmail, plan: activatePlan }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActivateError(
          json.error === "email_taken" ? "Cet email est déjà utilisé." :
          json.error === "already_activated" ? "Ce prospect est déjà activé." :
          "Erreur lors de la création du compte."
        );
        return;
      }
      setActivateResult(json);
      setSelected((s) => s ? { ...s, status: "ACTIVATED" } : s);
      fetchData({ search, status: statusFilter, city: cityFilter, page });
    } finally {
      setActivateLoading(false);
    }
  }

  // ── Export CSV ───────────────────────────────────────────────────────────
  async function exportCSV() {
    const all = await fetch("/api/prospects?limit=1000").then((r) => r.json());
    const rows = all.prospects as Prospect[];
    const headers = ["name", "city", "address", "phone", "email", "website", "category", "status", "sourceUrl"];
    const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((p) => headers.map((h) => esc((p as any)[h])).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "prospects-matable.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Open prospect panel ──────────────────────────────────────────────────
  function openProspect(p: Prospect) {
    setSelected(p);
    setActivating(false);
    setActivateResult(null);
    setActivateError(null);
    setActivateEmail(p.email ?? "");
    setNotesValue(p.notes ?? "");
    setEditingNotes(false);
  }

  const stats = data?.stats;
  const totalAll = (stats?.NEW ?? 0) + (stats?.CONTACTED ?? 0) + (stats?.ACTIVATED ?? 0) + (stats?.IGNORED ?? 0);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${selected ? "mr-[420px]" : ""}`}>

        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-2xl font-black text-white">🎯 Base de Prospection</h1>
              <p className="text-slate-400 text-sm mt-0.5">Restaurants scrapés sur lacarte.menu — à convertir en clients</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 text-sm transition-colors"
              >
                ⬇ CSV
              </button>
              <a
                href="https://github.com/qrDOTtech1/MaTable-API/tree/main/data"
                target="_blank"
                rel="noopener"
                className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 text-sm transition-colors"
              >
                📂 Git
              </a>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 mb-5">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                <p className="text-2xl font-black text-white">{totalAll}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total scrapés</p>
              </div>
              {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as ProspectStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1); }}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      statusFilter === s
                        ? `${cfg.bg} ${cfg.border}`
                        : "bg-slate-900 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <p className={`text-2xl font-black ${cfg.color}`}>{stats[s]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cfg.label}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Rechercher un restaurant, ville…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            />
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="">Toutes les villes</option>
              {data?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {(search || statusFilter || cityFilter) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); setCityFilter(""); setPage(1); fetchData({ page: 1 }); }}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-sm transition-colors"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : data?.prospects.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-slate-400 text-lg font-medium">Aucun prospect trouvé</p>
              <p className="text-slate-600 text-sm mt-1">
                Lancez le scraper : <code className="text-orange-400">npx tsx scripts/scrape-lacarte.ts</code>
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                {data?.prospects.map((p) => {
                  const cfg = STATUS_CONFIG[p.status];
                  const isSelected = selected?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => openProspect(p)}
                      className={`w-full text-left rounded-xl border p-4 transition-all hover:border-slate-600 ${
                        isSelected
                          ? "bg-orange-500/10 border-orange-500/40"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <span className="text-lg">🍽️</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white truncate">{p.name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                            {p.city && <span>📍 {p.city}</span>}
                            {p.category && <span>🏷️ {p.category}</span>}
                            {p.phone && <span>📞 {p.phone}</span>}
                            {p.email && <span>✉️ {p.email}</span>}
                          </div>
                        </div>

                        {/* Arrow */}
                        <span className="text-slate-600 text-sm flex-shrink-0">›</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 text-sm transition-colors"
                  >
                    ← Précédent
                  </button>
                  <span className="text-slate-500 text-sm">{page} / {data.pages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 text-sm transition-colors"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right slide panel ──────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl z-50">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <p className="font-bold text-white truncate pr-4">{selected.name}</p>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
          </div>

          {/* Scroll area */}
          <div className="flex-1 overflow-y-auto">
            {/* Image */}
            {selected.imageUrl && (
              <div className="h-36 bg-slate-900 overflow-hidden">
                <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-5 space-y-5">

              {/* Status buttons */}
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Statut</p>
                <div className="flex flex-wrap gap-2">
                  {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as ProspectStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    if (s === "ACTIVATED") return null; // activation via button only
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selected, s)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          selected.status === s
                            ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact info */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 divide-y divide-slate-800">
                {[
                  { icon: "📍", label: "Adresse",  value: [selected.address, selected.city].filter(Boolean).join(", ") },
                  { icon: "📞", label: "Téléphone", value: selected.phone, href: selected.phone ? `tel:${selected.phone}` : undefined },
                  { icon: "✉️", label: "Email",     value: selected.email, href: selected.email ? `mailto:${selected.email}` : undefined },
                  { icon: "🌐", label: "Site",      value: selected.website, href: selected.website },
                  { icon: "🏷️", label: "Catégorie", value: selected.category },
                  { icon: "🔗", label: "Source",    value: selected.sourceUrl, href: selected.sourceUrl },
                ].map(({ icon, label, value, href }) =>
                  value ? (
                    <div key={label} className="px-4 py-3 flex items-start gap-3">
                      <span className="text-sm w-4 flex-shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
                        {href ? (
                          <a href={href} target="_blank" rel="noopener" className="text-sm text-orange-400 hover:text-orange-300 truncate block">{value}</a>
                        ) : (
                          <p className="text-sm text-white">{value}</p>
                        )}
                      </div>
                    </div>
                  ) : null
                )}
              </div>

              {/* Description */}
              {selected.description && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Description</p>
                  <p className="text-sm text-slate-400 leading-relaxed bg-slate-900 border border-slate-800 rounded-xl p-4">
                    {selected.description}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Notes internes</p>
                  {!editingNotes && (
                    <button onClick={() => { setEditingNotes(true); setNotesValue(selected.notes ?? ""); }} className="text-xs text-orange-400 hover:text-orange-300">
                      {selected.notes ? "✏️ Modifier" : "+ Ajouter"}
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-orange-500"
                      placeholder="Ajouter des notes…"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveNotes} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold">Sauver</button>
                      <button onClick={() => setEditingNotes(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-[60px]">
                    {selected.notes ?? <span className="text-slate-600 italic">Aucune note</span>}
                  </p>
                )}
              </div>

              {/* ── Activation ──────────────────────────────────────── */}
              {selected.status === "ACTIVATED" ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                  <p className="text-emerald-300 font-bold">✅ Compte activé</p>
                  {selected.activatedAt && (
                    <p className="text-xs text-slate-500 mt-1">
                      le {new Date(selected.activatedAt).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {selected.restaurantId && (
                    <a
                      href={`/dashboard/restaurants/${selected.restaurantId}`}
                      className="mt-2 inline-block text-xs text-orange-400 hover:text-orange-300"
                    >
                      Voir le restaurant →
                    </a>
                  )}
                </div>
              ) : activateResult ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 space-y-3">
                  <p className="font-bold text-emerald-300 text-center">🎉 Compte créé avec succès !</p>
                  <div className="rounded-lg bg-slate-900 p-4 space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span className="text-white">{activateResult.credentials.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mot de passe</span>
                      <span className="text-orange-400 font-bold">{activateResult.credentials.password}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">URL</span>
                      <a href={activateResult.credentials.loginUrl} target="_blank" className="text-blue-400 truncate ml-2">{activateResult.credentials.loginUrl}</a>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const text = `Email : ${activateResult.credentials.email}\nMot de passe : ${activateResult.credentials.password}\nURL : ${activateResult.credentials.loginUrl}`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="w-full py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    📋 Copier les identifiants
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                  <p className="text-sm font-bold text-white">🔑 Créer un compte restaurant</p>

                  {!activating ? (
                    <button
                      onClick={() => setActivating(true)}
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all"
                    >
                      ➕ Activer ce prospect
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 font-medium">Email du propriétaire</label>
                        <input
                          type="email"
                          value={activateEmail}
                          onChange={(e) => setActivateEmail(e.target.value)}
                          placeholder="proprio@restaurant.fr"
                          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-medium">Abonnement</label>
                        <select
                          value={activatePlan}
                          onChange={(e) => setActivatePlan(e.target.value)}
                          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                        >
                          {Object.entries(PLAN_PRICES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      {activateError && <p className="text-xs text-red-400">{activateError}</p>}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleActivate}
                          disabled={!activateEmail || activateLoading}
                          className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          {activateLoading ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création…</>
                          ) : "✅ Créer le compte"}
                        </button>
                        <button onClick={() => setActivating(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm hover:text-white transition-colors">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
