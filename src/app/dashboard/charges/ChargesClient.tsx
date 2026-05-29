"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type Charge = {
  id: string;
  category: string;
  supplier: string;
  label: string | null;
  dateIssued: string;
  amountHtCents: number;
  vatRatePct: number;
  vatAmountCents: number;
  amountTtcCents: number;
  currency: string;
  vatDeductible: boolean;
  paid: boolean;
  notes: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  createdAt: string;
};

const CATEGORIES: Array<{ key: string; label: string; icon: string; vatHint: string }> = [
  { key: "SERVEUR",       label: "Serveurs / hébergement", icon: "🖥️", vatHint: "TVA 100 % récupérable" },
  { key: "IA_API",        label: "API IA / inférence",     icon: "🤖", vatHint: "TVA 100 % récupérable" },
  { key: "TELEPHONIE",    label: "Téléphonie / internet",  icon: "📞", vatHint: "TVA 100 % récupérable" },
  { key: "LOGICIEL_SAAS", label: "Logiciel / SaaS",        icon: "💻", vatHint: "TVA 100 % récupérable" },
  { key: "MARKETING",     label: "Marketing / pub",        icon: "📣", vatHint: "TVA 100 % récupérable" },
  { key: "FOURNITURES",   label: "Fournitures bureau",     icon: "📎", vatHint: "TVA 100 % récupérable" },
  { key: "DEPLACEMENT",   label: "Déplacement / hôtel",    icon: "✈️", vatHint: "Hôtels : non récupérable. Train/avion : OK. Repas : OK si pro" },
  { key: "AUTRE",         label: "Autre",                  icon: "📦", vatHint: "Vérifiez la déductibilité" },
];
const CAT_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

function eur(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
function fdate(s: string) {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ChargesClient({ charges }: { charges: Charge[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()));

  // ── Stats ────────────────────────────────────────────────────────────────
  const now = new Date();
  const stats = useMemo(() => {
    const currentYear = now.getFullYear();
    const ytdHt = sumWhere(charges, c => new Date(c.dateIssued).getFullYear() === currentYear, c => c.amountHtCents);
    const ytdVat = sumWhere(charges, c => new Date(c.dateIssued).getFullYear() === currentYear && c.vatDeductible, c => c.vatAmountCents);
    const ytdTtc = sumWhere(charges, c => new Date(c.dateIssued).getFullYear() === currentYear, c => c.amountTtcCents);

    // 12 derniers mois glissants
    const cutoff = new Date(now.getTime() - 365 * 86400_000);
    const rolling12VatDeductible = sumWhere(charges, c => new Date(c.dateIssued) >= cutoff && c.vatDeductible, c => c.vatAmountCents);

    // Mois courant
    const monthStart = new Date(currentYear, now.getMonth(), 1);
    const monthHt = sumWhere(charges, c => new Date(c.dateIssued) >= monthStart, c => c.amountHtCents);
    const monthVat = sumWhere(charges, c => new Date(c.dateIssued) >= monthStart && c.vatDeductible, c => c.vatAmountCents);

    // Par catégorie (année en cours)
    const byCat = new Map<string, { ht: number; vatDeductible: number; ttc: number }>();
    for (const c of charges) {
      if (new Date(c.dateIssued).getFullYear() !== currentYear) continue;
      const cur = byCat.get(c.category) ?? { ht: 0, vatDeductible: 0, ttc: 0 };
      cur.ht += c.amountHtCents;
      cur.ttc += c.amountTtcCents;
      if (c.vatDeductible) cur.vatDeductible += c.vatAmountCents;
      byCat.set(c.category, cur);
    }

    return { ytdHt, ytdVat, ytdTtc, rolling12VatDeductible, monthHt, monthVat, byCat };
  }, [charges]);

  // ── Filtrage du tableau ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return charges.filter(c => {
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (yearFilter !== "all" && String(new Date(c.dateIssued).getFullYear()) !== yearFilter) return false;
      if (!term) return true;
      return (c.supplier.toLowerCase().includes(term) || (c.label ?? "").toLowerCase().includes(term));
    });
  }, [charges, filter, catFilter, yearFilter]);

  const years = useMemo(() => {
    const set = new Set<string>();
    charges.forEach(c => set.add(String(new Date(c.dateIssued).getFullYear())));
    return Array.from(set).sort().reverse();
  }, [charges]);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette charge ?")) return;
    await fetch(`/api/admin/charges/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={`Total HT ${now.getFullYear()}`} value={eur(stats.ytdHt)} />
        <Kpi label="TVA déductible (année)" value={eur(stats.ytdVat)} tone="emerald" />
        <Kpi label={`Total TTC ${now.getFullYear()}`} value={eur(stats.ytdTtc)} />
        <Kpi label="TVA récupérable 12 mois" value={eur(stats.rolling12VatDeductible)} tone="emerald" hint="à demander à l'administration" />
      </div>

      {/* Bandeau rappel TVA */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5 text-sm text-emerald-100/80">
        <p className="font-bold text-emerald-300 mb-2">💡 Ce que vous pouvez récupérer / déduire</p>
        <ul className="space-y-1 list-disc list-inside text-emerald-100/70">
          <li><strong>TVA déductible</strong> : tout achat B2B avec facture conforme (SIRET fournisseur, TVA, mentions légales). Cochez la case pour l'inclure dans le total à demander.</li>
          <li><strong>Charges déductibles du résultat</strong> : 100 % du HT pour serveurs, IA, SaaS, télécom, marketing, fournitures.</li>
          <li><strong>Cas particuliers</strong> : hôtels (TVA <em>non</em> récupérable), restaurants (OK si pro), carburant essence (80 %), cadeaux clients &gt; 73 € TTC (non récupérable).</li>
          <li>Pour la déclaration TVA : cumul de la <strong>TVA déductible mensuelle/trimestrielle</strong> reporté en case A4 de la CA3.</li>
        </ul>
      </div>

      {/* Par catégorie année courante */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-3">Par catégorie · {now.getFullYear()}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {CATEGORIES.map(c => {
            const s = stats.byCat.get(c.key);
            if (!s) return null;
            return (
              <div key={c.key} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                <p className="text-xs font-bold text-white/70">{c.icon} {c.label}</p>
                <p className="text-base font-black text-white mt-1">{eur(s.ht)} <span className="text-[10px] text-white/40">HT</span></p>
                <p className="text-xs text-emerald-400 font-semibold">{eur(s.vatDeductible)} <span className="text-[10px] text-white/40">TVA récup.</span></p>
              </div>
            );
          })}
          {stats.byCat.size === 0 && <p className="col-span-full text-sm text-white/40">Aucune charge sur l'année en cours.</p>}
        </div>
      </div>

      {/* Bouton + form */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-colors"
        >
          {showForm ? "Fermer" : "➕ Ajouter une charge"}
        </button>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher fournisseur ou libellé…"
          className="flex-1 min-w-48 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="all">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="all">Toutes années</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {showForm && <ChargeForm onSaved={() => { setShowForm(false); router.refresh(); }} />}

      {/* Tableau */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Fournisseur</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3 text-right">HT</th>
              <th className="px-4 py-3 text-right">TVA</th>
              <th className="px-4 py-3 text-right">TTC</th>
              <th className="px-4 py-3 text-center">Récup.</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                Aucune charge — ajoutez votre première facture fournisseur.
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 text-slate-400">{fdate(c.dateIssued)}</td>
                <td className="px-4 py-3 font-medium">
                  <p className="text-white">{c.supplier}</p>
                  {c.label && <p className="text-xs text-white/40">{c.label}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {CAT_BY_KEY[c.category]?.icon} {CAT_BY_KEY[c.category]?.label ?? c.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{eur(c.amountHtCents)}</td>
                <td className="px-4 py-3 text-right">{eur(c.vatAmountCents)} <span className="text-[10px] text-white/30">{c.vatRatePct}%</span></td>
                <td className="px-4 py-3 text-right font-bold">{eur(c.amountTtcCents)}</td>
                <td className="px-4 py-3 text-center">
                  {c.vatDeductible
                    ? <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">✓</span>
                    : <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-700/40 text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {c.fileName && (
                    <a href={`/api/admin/charges/${c.id}/file`} target="_blank" rel="noopener noreferrer"
                      className="text-orange-400 hover:underline text-xs font-semibold">📎 Fichier</a>
                  )}
                  <button onClick={() => handleDelete(c.id)}
                    className="ml-3 text-red-400 hover:underline text-xs">Suppr.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sumWhere<T>(arr: T[], pred: (t: T) => boolean, val: (t: T) => number): number {
  let s = 0;
  for (const x of arr) if (pred(x)) s += val(x);
  return s;
}

function Kpi({ label, value, tone = "white", hint }: { label: string; value: React.ReactNode; tone?: "white" | "emerald"; hint?: string }) {
  const colors: Record<string, string> = { white: "text-white", emerald: "text-emerald-400" };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
      {hint && <p className="text-[10px] text-white/30 mt-0.5">{hint}</p>}
    </div>
  );
}

function ChargeForm({ onSaved }: { onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const fd = new FormData(e.currentTarget);
      const r = await fetch("/api/admin/charges", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur");
      onSaved();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Catégorie">
          <select name="category" required defaultValue="SERVEUR"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
          </select>
        </Field>
        <Field label="Date facture">
          <input name="dateIssued" type="date" required defaultValue={today}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Fournisseur">
          <input name="supplier" required placeholder="OVH, Anthropic, Free Pro…"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Libellé (optionnel)">
          <input name="label" placeholder="Serveur Web Avril"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Montant HT (€)">
          <input name="amountHt" type="number" step="0.01" min="0" required
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Taux TVA (%)">
          <select name="vatRatePct" defaultValue="20"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="20">20 % (normal)</option>
            <option value="10">10 % (intermédiaire)</option>
            <option value="5.5">5,5 %</option>
            <option value="0">0 % (hors UE / exonéré)</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Notes">
          <textarea name="notes" rows={2}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Pièce jointe (PDF / image, max 10 Mo)">
          <input name="file" type="file" accept="application/pdf,image/*"
            className="w-full text-sm text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-orange-500 file:text-white" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" name="vatDeductible" defaultChecked /> TVA déductible
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" name="paid" defaultChecked /> Payée
        </label>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="flex justify-end">
        <button disabled={busy}
          className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-50">
          {busy ? "Enregistrement…" : "Enregistrer la charge"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
