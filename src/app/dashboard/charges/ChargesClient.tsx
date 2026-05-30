"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { printDocumentNode } from "../documents/printUtil";

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

      <ExportsBlock charges={charges} />

      <QuickPhotoCharge onSaved={() => router.refresh()} />

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
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  // État contrôlé pour permettre à l'IA de pré-remplir
  const [category, setCategory] = useState("SERVEUR");
  const [supplier, setSupplier] = useState("");
  const [label, setLabel] = useState("");
  const [dateIssued, setDateIssued] = useState(today);
  const [amountHt, setAmountHt] = useState("");
  const [vatRatePct, setVatRatePct] = useState("20");

  async function runExtract(file: File) {
    setAiBusy(true); setAiMsg("Analyse en cours…");
    try {
      const ctl = new AbortController();
      const j = await streamExtract(file, ctl.signal, (info) => {
        setAiMsg(`🤖 IA en train d'analyser… ${info.chars} caractère(s)`);
      });
      if (j.error) { setAiMsg(`IA : ${j.error}`); return; }
      const filled: string[] = [];
      if (j.supplier) { setSupplier(j.supplier); filled.push("fournisseur"); }
      if (j.label) { setLabel(j.label); filled.push("libellé"); }
      if (j.dateIssued) { setDateIssued(j.dateIssued); filled.push("date"); }
      if (typeof j.amountHt === "number") { setAmountHt(String(j.amountHt)); filled.push("montant HT"); }
      if (typeof j.vatRatePct === "number") { setVatRatePct(String(j.vatRatePct)); filled.push("TVA"); }
      if (j.suggestedCategory) { setCategory(j.suggestedCategory); filled.push("catégorie"); }
      setAiMsg(filled.length > 0 ? `✨ Pré-rempli : ${filled.join(", ")}. Vérifiez avant d'enregistrer.` : "IA n'a rien trouvé d'exploitable.");
    } catch (e: any) {
      setAiMsg(`Erreur IA : ${e?.message ?? "réseau"}`);
    } finally { setAiBusy(false); }
  }

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
      {/* Zone IA : drop fichier image → extraction auto */}
      <div className="rounded-xl border border-purple-500/25 bg-purple-500/[0.06] p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-purple-300">🤖 Pré-remplir avec l'IA</span>
          <input
            type="file"
            accept="image/*"
            disabled={aiBusy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) runExtract(f); }}
            className="flex-1 min-w-48 text-sm text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-purple-500 file:text-white file:font-bold"
          />
          {aiBusy && <span className="text-xs text-purple-300">Analyse…</span>}
        </div>
        <p className="text-[11px] text-purple-200/60">
          Sélectionnez une <strong>photo</strong> (JPG/PNG) de la facture — l'IA lit les champs et les pré-remplit ci-dessous.
          Pour conserver le PDF original, joignez-le en pièce ci-dessous après vérification.
        </p>
        {aiMsg && <p className="text-xs text-purple-200/90 font-semibold">{aiMsg}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Catégorie">
          <select name="category" required value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
          </select>
        </Field>
        <Field label="Date facture">
          <input name="dateIssued" type="date" required value={dateIssued} onChange={(e) => setDateIssued(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Fournisseur">
          <input name="supplier" required placeholder="OVH, Anthropic, Free Pro…" value={supplier} onChange={(e) => setSupplier(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Libellé (optionnel)">
          <input name="label" placeholder="Serveur Web Avril" value={label} onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Montant HT (€)">
          <input name="amountHt" type="number" step="0.01" min="0" required value={amountHt} onChange={(e) => setAmountHt(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Taux TVA (%)">
          <select name="vatRatePct" value={vatRatePct} onChange={(e) => setVatRatePct(e.target.value)}
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
        <Field label="Pièce jointe à archiver (PDF/image, max 10 Mo)">
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

// ═════════════════════════════════════════════════════════════════════════
// Exports & déclarations
// ═════════════════════════════════════════════════════════════════════════
function ExportsBlock({ charges }: { charges: Charge[] }) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [period, setPeriod] = useState<"year" | "q1" | "q2" | "q3" | "q4" | "m">("year");
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  function rangeFor(): { from: Date; to: Date; label: string } {
    const y = parseInt(year, 10);
    if (period === "year") return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59), label: `Année ${y}` };
    if (period.startsWith("q")) {
      const q = parseInt(period.slice(1), 10);
      const startM = (q - 1) * 3;
      return { from: new Date(y, startM, 1), to: new Date(y, startM + 3, 0, 23, 59, 59), label: `T${q} ${y}` };
    }
    const m = parseInt(month, 10) - 1;
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59), label: `${new Date(y, m, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` };
  }

  function filtered() {
    const { from, to } = rangeFor();
    return charges.filter(c => { const d = new Date(c.dateIssued); return d >= from && d <= to; });
  }

  function totals(list: Charge[]) {
    const totalHt = list.reduce((s, c) => s + c.amountHtCents, 0);
    const totalTtc = list.reduce((s, c) => s + c.amountTtcCents, 0);
    const totalVatDed = list.filter(c => c.vatDeductible).reduce((s, c) => s + c.vatAmountCents, 0);
    const byRate = new Map<number, { ht: number; vat: number; vatDed: number; count: number }>();
    for (const c of list) {
      const cur = byRate.get(c.vatRatePct) ?? { ht: 0, vat: 0, vatDed: 0, count: 0 };
      cur.ht += c.amountHtCents; cur.vat += c.vatAmountCents;
      if (c.vatDeductible) cur.vatDed += c.vatAmountCents;
      cur.count += 1;
      byRate.set(c.vatRatePct, cur);
    }
    return { totalHt, totalTtc, totalVatDed, byRate };
  }

  function genTvaReport() {
    const list = filtered(); const t = totals(list); const r = rangeFor();
    const node = document.createElement("div");
    node.className = "matable-print-doc";
    node.style.cssText = "width:210mm;min-height:297mm;padding:14mm 12mm;box-sizing:border-box;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;margin:0 auto";
    node.innerHTML = `
      <div style="border-bottom:3px solid #ea580c;padding-bottom:12px;margin-bottom:16px">
        <div style="font-size:22px;font-weight:900">Ma<span style="color:#ea580c">Table</span>.Pro — Rapport TVA déductible</div>
        <div style="font-size:13px;color:#444;margin-top:4px">Période : <strong>${r.label}</strong> · Édité le ${fdate(new Date().toISOString())}</div>
      </div>

      <h2 style="font-size:14px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:4px;margin:14px 0 8px">Récapitulatif par taux de TVA</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:7px;text-align:left;border-bottom:1px solid #ccc">Taux</th>
          <th style="padding:7px;text-align:right;border-bottom:1px solid #ccc">Factures</th>
          <th style="padding:7px;text-align:right;border-bottom:1px solid #ccc">Base HT</th>
          <th style="padding:7px;text-align:right;border-bottom:1px solid #ccc">TVA</th>
          <th style="padding:7px;text-align:right;border-bottom:1px solid #ccc">TVA déductible</th>
        </tr></thead>
        <tbody>
        ${Array.from(t.byRate.entries()).sort((a,b) => b[0]-a[0]).map(([rate, d]) => `
          <tr>
            <td style="padding:6px 7px;border-bottom:1px solid #eee">${rate} %</td>
            <td style="padding:6px 7px;text-align:right;border-bottom:1px solid #eee">${d.count}</td>
            <td style="padding:6px 7px;text-align:right;border-bottom:1px solid #eee">${eur(d.ht)}</td>
            <td style="padding:6px 7px;text-align:right;border-bottom:1px solid #eee">${eur(d.vat)}</td>
            <td style="padding:6px 7px;text-align:right;border-bottom:1px solid #eee;color:#059669;font-weight:700">${eur(d.vatDed)}</td>
          </tr>`).join("")}
        <tr style="background:#fafafa;font-weight:900">
          <td style="padding:8px 7px;border-top:2px solid #ea580c">Total</td>
          <td style="padding:8px 7px;text-align:right;border-top:2px solid #ea580c">${list.length}</td>
          <td style="padding:8px 7px;text-align:right;border-top:2px solid #ea580c">${eur(t.totalHt)}</td>
          <td style="padding:8px 7px;text-align:right;border-top:2px solid #ea580c">${eur(t.totalTtc - t.totalHt)}</td>
          <td style="padding:8px 7px;text-align:right;border-top:2px solid #ea580c;color:#059669">${eur(t.totalVatDed)}</td>
        </tr>
        </tbody>
      </table>

      <div style="background:#ecfdf5;border-left:3px solid #059669;padding:10px 12px;margin:14px 0;font-size:11px">
        <strong style="color:#065f46">À reporter en déclaration CA3</strong> — Cadre B "TVA déductible" :<br/>
        • Ligne 19 (Autres biens et services) : <strong>${eur(t.totalVatDed)}</strong><br/>
        • Ligne 22 (Total TVA déductible) : reporter ce montant
      </div>

      <h2 style="font-size:14px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:4px;margin:14px 0 8px">Détail des factures (${list.length})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:6px;text-align:left;border-bottom:1px solid #ccc">Date</th>
          <th style="padding:6px;text-align:left;border-bottom:1px solid #ccc">Fournisseur</th>
          <th style="padding:6px;text-align:left;border-bottom:1px solid #ccc">Catégorie</th>
          <th style="padding:6px;text-align:right;border-bottom:1px solid #ccc">HT</th>
          <th style="padding:6px;text-align:right;border-bottom:1px solid #ccc">TVA</th>
          <th style="padding:6px;text-align:right;border-bottom:1px solid #ccc">TTC</th>
          <th style="padding:6px;text-align:center;border-bottom:1px solid #ccc">Récup.</th>
        </tr></thead>
        <tbody>
        ${list.map(c => `
          <tr>
            <td style="padding:5px 6px;border-bottom:1px solid #f0f0f0">${fdate(c.dateIssued)}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f0f0f0">${c.supplier}${c.label ? ` <span style="color:#888">— ${c.label}</span>` : ""}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f0f0f0;color:#666">${CAT_BY_KEY[c.category]?.label ?? c.category}</td>
            <td style="padding:5px 6px;text-align:right;border-bottom:1px solid #f0f0f0">${eur(c.amountHtCents)}</td>
            <td style="padding:5px 6px;text-align:right;border-bottom:1px solid #f0f0f0">${eur(c.vatAmountCents)}</td>
            <td style="padding:5px 6px;text-align:right;border-bottom:1px solid #f0f0f0;font-weight:600">${eur(c.amountTtcCents)}</td>
            <td style="padding:5px 6px;text-align:center;border-bottom:1px solid #f0f0f0">${c.vatDeductible ? "✓" : "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>

      <div style="font-size:9px;color:#999;border-top:1px solid #eee;padding-top:10px;margin-top:14px">
        Document généré automatiquement par MaTable.Pro Admin. À conserver pendant 10 ans (Art. L102 B LPF).
      </div>
    `;
    printDocumentNode(node, `Rapport TVA ${r.label}`);
  }

  function gen3519() {
    const list = filtered(); const t = totals(list); const r = rangeFor();
    const node = document.createElement("div");
    node.className = "matable-print-doc";
    node.style.cssText = "width:210mm;min-height:297mm;padding:14mm 12mm;box-sizing:border-box;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;margin:0 auto";
    node.innerHTML = `
      <div style="border-bottom:3px solid #ea580c;padding-bottom:12px;margin-bottom:16px">
        <div style="font-size:22px;font-weight:900">Préparation — Formulaire <span style="color:#ea580c">3519-SD</span></div>
        <div style="font-size:13px;color:#444;margin-top:4px">Demande de remboursement de crédit de TVA · Période : <strong>${r.label}</strong></div>
      </div>

      <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 12px;margin-bottom:14px;font-size:11px;color:#92400e">
        ⚠️ Document préparatoire interne. La demande officielle se fait sur impots.gouv.fr → Espace pro → TVA → Formulaire 3519-SD.
        Reportez les montants ci-dessous dans les cases correspondantes.
      </div>

      <h2 style="font-size:14px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:4px;margin:14px 0 8px">Calcul du crédit de TVA</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr><td style="padding:8px;background:#f5f5f5;border-bottom:1px solid #ddd"><strong>TVA déductible (achats / charges) — sur la période</strong></td>
            <td style="padding:8px;text-align:right;background:#f5f5f5;border-bottom:1px solid #ddd;font-family:monospace;color:#059669;font-weight:700">${eur(t.totalVatDed)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">TVA collectée (à compléter manuellement depuis vos factures émises)</td>
            <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;font-family:monospace;color:#666">à reporter</td></tr>
        <tr><td style="padding:10px 8px;border-top:2px solid #ea580c;font-weight:900">Crédit de TVA (= déductible − collectée)</td>
            <td style="padding:10px 8px;text-align:right;border-top:2px solid #ea580c;font-family:monospace;font-weight:900;color:#059669">à calculer</td></tr>
      </table>

      <h2 style="font-size:14px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px">Seuils et conditions de remboursement</h2>
      <ul style="font-size:11px;color:#333;padding-left:18px;line-height:1.5">
        <li><strong>Demande mensuelle/trimestrielle</strong> : crédit ≥ 760 € (entreprises au régime réel normal).</li>
        <li><strong>Demande annuelle (CA12)</strong> : crédit ≥ 150 €.</li>
        <li>Le crédit non remboursé est <strong>reporté</strong> sur la déclaration suivante (ligne 27 CA3).</li>
        <li>Délai de traitement : 1 à 4 mois en moyenne.</li>
      </ul>

      <h2 style="font-size:14px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px">Pièces à joindre au dossier</h2>
      <ul style="font-size:11px;color:#333;padding-left:18px;line-height:1.5">
        <li>RIB du compte bancaire de l'entreprise (remboursement par virement).</li>
        <li>Justificatifs des achats déclarés (factures fournisseurs avec TVA) — ${list.length} pièce(s) sur la période.</li>
        <li>État détaillé de la TVA déductible par taux (rapport TVA généré séparément).</li>
      </ul>

      <h2 style="font-size:14px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px">Récapitulatif TVA déductible par taux</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:6px;text-align:left;border-bottom:1px solid #ccc">Taux</th>
          <th style="padding:6px;text-align:right;border-bottom:1px solid #ccc">Base HT</th>
          <th style="padding:6px;text-align:right;border-bottom:1px solid #ccc">TVA déductible</th>
        </tr></thead>
        <tbody>
        ${Array.from(t.byRate.entries()).sort((a,b) => b[0]-a[0]).map(([rate, d]) => `
          <tr>
            <td style="padding:5px 6px;border-bottom:1px solid #eee">${rate} %</td>
            <td style="padding:5px 6px;text-align:right;border-bottom:1px solid #eee">${eur(d.ht)}</td>
            <td style="padding:5px 6px;text-align:right;border-bottom:1px solid #eee;font-weight:600;color:#059669">${eur(d.vatDed)}</td>
          </tr>`).join("")}
        </tbody>
      </table>

      <div style="font-size:9px;color:#999;border-top:1px solid #eee;padding-top:10px;margin-top:18px">
        Préparation MaTable.Pro Admin · à conserver pendant 10 ans. Source : Art. 271-IV CGI, BOI-TVA-DED-50-20-30.
      </div>
    `;
    printDocumentNode(node, `Préparation 3519 ${r.label}`);
  }

  function exportCsv() {
    const list = filtered(); const r = rangeFor();
    const head = ["Date", "Fournisseur", "Libellé", "Catégorie", "HT", "Taux TVA %", "TVA", "TTC", "TVA déductible", "Notes"].join(";");
    const rows = list.map(c => [
      fdate(c.dateIssued),
      escapeCsv(c.supplier),
      escapeCsv(c.label ?? ""),
      escapeCsv(CAT_BY_KEY[c.category]?.label ?? c.category),
      (c.amountHtCents / 100).toFixed(2).replace(".", ","),
      String(c.vatRatePct),
      (c.vatAmountCents / 100).toFixed(2).replace(".", ","),
      (c.amountTtcCents / 100).toFixed(2).replace(".", ","),
      c.vatDeductible ? "Oui" : "Non",
      escapeCsv(c.notes ?? ""),
    ].join(";"));
    // BOM UTF-8 pour Excel
    const csv = "﻿" + [head, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `journal-achats-${r.label.replace(/\s/g, "-")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  const list = filtered(); const t = totals(list); const r = rangeFor();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">📄 Exports & déclarations</h2>
          <p className="text-xs text-white/40 mt-0.5">Période : <strong className="text-white">{r.label}</strong> · {list.length} pièce(s) · TVA déductible <strong className="text-emerald-400">{eur(t.totalVatDed)}</strong></p>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="year">Année</option>
            <option value="q1">T1 (Jan-Mar)</option>
            <option value="q2">T2 (Avr-Juin)</option>
            <option value="q3">T3 (Juil-Sep)</option>
            <option value="q4">T4 (Oct-Déc)</option>
            <option value="m">Mois précis</option>
          </select>
          {period === "m" && (
            <select value={month} onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" })}</option>
              ))}
            </select>
          )}
          <select value={year} onChange={(e) => setYear(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button onClick={genTvaReport} disabled={list.length === 0}
          className="flex items-start gap-3 text-left p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors">
          <span className="text-xl">📊</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-300">Rapport TVA déductible</p>
            <p className="text-[11px] text-white/50">PDF récap par taux, montants à reporter en CA3 cadre B.</p>
          </div>
        </button>

        <button onClick={gen3519} disabled={list.length === 0}
          className="flex items-start gap-3 text-left p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 disabled:opacity-40 transition-colors">
          <span className="text-xl">💰</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-300">Préparation 3519-SD</p>
            <p className="text-[11px] text-white/50">PDF demande de remboursement TVA — montants pré-calculés.</p>
          </div>
        </button>

        <button onClick={exportCsv} disabled={list.length === 0}
          className="flex items-start gap-3 text-left p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 disabled:opacity-40 transition-colors">
          <span className="text-xl">📋</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-sky-300">Journal des achats</p>
            <p className="text-[11px] text-white/50">CSV pour votre expert-comptable (compatible Excel).</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Détection rapide par photo : 1 bouton → IA → confirmation éclair → save
// ═════════════════════════════════════════════════════════════════════════
function QuickPhotoCharge({ onSaved }: { onSaved: () => void }) {
  const [phase, setPhase] = useState<"idle" | "analyzing" | "confirm" | "saving">("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Champs détectés / éditables avant enregistrement
  const today = new Date().toISOString().slice(0, 10);
  const [category, setCategory] = useState("SERVEUR");
  const [supplier, setSupplier] = useState("");
  const [label, setLabel] = useState("");
  const [dateIssued, setDateIssued] = useState(today);
  const [amountHt, setAmountHt] = useState("");
  const [vatRatePct, setVatRatePct] = useState("20");
  const [vatDeductible, setVatDeductible] = useState(true);
  const [aiChars, setAiChars] = useState(0);
  const [aiSnippet, setAiSnippet] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useState<{ ctl: AbortController | null }>({ ctl: null })[0];

  // Compteur de secondes écoulées pendant l'analyse
  useEffect(() => {
    if (phase !== "analyzing") return;
    setElapsed(0);
    const iv = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  async function onPickFile(f: File) {
    setErr(null);
    setAiChars(0); setAiSnippet("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPhase("analyzing");
    const ctl = new AbortController();
    abortRef.ctl = ctl;
    try {
      const j = await streamExtract(f, ctl.signal, (info) => {
        setAiChars(info.chars); setAiSnippet(info.snippet);
      });
      if (ctl.signal.aborted) return; // utilisateur a coupé
      if (j.error) {
        setErr(j.error);
      } else {
        if (j.supplier) setSupplier(j.supplier);
        if (j.label) setLabel(j.label);
        if (j.dateIssued) setDateIssued(j.dateIssued);
        if (typeof j.amountHt === "number") setAmountHt(String(j.amountHt));
        if (typeof j.vatRatePct === "number") setVatRatePct(String(j.vatRatePct));
        if (j.suggestedCategory) setCategory(j.suggestedCategory);
      }
      setPhase("confirm");
    } catch (e: any) {
      if (!ctl.signal.aborted) {
        setErr(String(e?.message ?? e));
        setPhase("confirm");
      }
    }
  }

  function skipToManual() {
    abortRef.ctl?.abort();
    setPhase("confirm");
  }

  async function save() {
    if (!file || !supplier || !amountHt || !dateIssued) {
      setErr("Fournisseur, date et montant HT requis.");
      return;
    }
    setPhase("saving"); setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);           // on archive la photo elle-même
      fd.append("category", category);
      fd.append("supplier", supplier);
      fd.append("label", label);
      fd.append("dateIssued", dateIssued);
      fd.append("amountHt", amountHt);
      fd.append("vatRatePct", vatRatePct);
      if (vatDeductible) fd.append("vatDeductible", "on");
      fd.append("paid", "true");
      const r = await fetch("/api/admin/charges", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur");
      // Reset + refresh
      reset();
      onSaved();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setPhase("confirm");
    }
  }

  function reset() {
    setPhase("idle"); setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); setErr(null);
    setCategory("SERVEUR"); setSupplier(""); setLabel("");
    setDateIssued(today); setAmountHt(""); setVatRatePct("20"); setVatDeductible(true);
  }

  const valid = supplier && amountHt && dateIssued;

  return (
    <>
      <label className="block">
        <div className="rounded-2xl border-2 border-dashed border-purple-500/40 bg-gradient-to-br from-purple-500/[0.08] to-orange-500/[0.05] p-5 hover:from-purple-500/[0.14] hover:to-orange-500/[0.10] transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/25 flex items-center justify-center text-3xl shrink-0">📸</div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-white">Détection auto par photo</p>
              <p className="text-sm text-purple-200/70 mt-0.5">
                Prenez la facture en photo — l'IA détecte tout, vous validez en 2 sec, c'est enregistré.
              </p>
            </div>
            <div className="text-xs font-bold text-purple-300 hidden sm:block">Tapez ici →</div>
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.currentTarget.value = ""; }}
        />
      </label>

      {/* Modal confirmation */}
      {phase !== "idle" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => phase !== "saving" && reset()} />
          <div className="relative w-full max-w-2xl max-h-[92vh] rounded-2xl border border-white/[0.08] bg-[#0f0f0f] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-lg font-black">
                {phase === "analyzing" ? "🤖 Analyse en cours…" : phase === "saving" ? "💾 Enregistrement…" : "✨ Vérifier et enregistrer"}
              </h2>
              <button onClick={reset} disabled={phase === "saving"} className="text-white/40 hover:text-white text-xl disabled:opacity-30">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
                {preview && (
                  <div className="rounded-xl border border-white/10 overflow-hidden bg-black flex items-start justify-center max-h-64">
                    <img src={preview} alt="aperçu facture" className="w-full h-auto max-h-64 object-contain" />
                  </div>
                )}
                <div className="space-y-3">
                  {phase === "analyzing" ? (
                    <div className="space-y-3 py-2">
                      <div className="flex items-center gap-3 text-purple-300">
                        <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Détection des champs en cours…</p>
                          <p className="text-[11px] text-purple-200/60 mt-0.5">
                            {aiChars > 0
                              ? `${aiChars} caractère(s) reçus de l'IA · ${elapsed}s`
                              : elapsed < 4
                              ? "Envoi de l'image au modèle vision…"
                              : `Modèle en train de réfléchir… ${elapsed}s écoulées`}
                          </p>
                        </div>
                      </div>
                      {aiSnippet && (
                        <pre className="text-[10px] font-mono text-purple-200/70 bg-black/30 rounded-lg p-2 max-h-24 overflow-hidden whitespace-pre-wrap">{aiSnippet}</pre>
                      )}
                      <button
                        onClick={skipToManual}
                        className="text-xs text-orange-300 hover:text-orange-200 font-semibold underline"
                      >
                        ✏️ Trop long ? Saisir à la main →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Catégorie">
                          <select value={category} onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                          </select>
                        </Field>
                        <Field label="Date">
                          <input type="date" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                        </Field>
                      </div>
                      <Field label="Fournisseur">
                        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nom du fournisseur"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                      </Field>
                      <Field label="Libellé (optionnel)">
                        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Description courte"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Montant HT (€)">
                          <input type="number" step="0.01" value={amountHt} onChange={(e) => setAmountHt(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                        </Field>
                        <Field label="TVA (%)">
                          <select value={vatRatePct} onChange={(e) => setVatRatePct(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                            <option value="20">20 %</option>
                            <option value="10">10 %</option>
                            <option value="5.5">5,5 %</option>
                            <option value="0">0 %</option>
                          </select>
                        </Field>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-white/70">
                        <input type="checkbox" checked={vatDeductible} onChange={(e) => setVatDeductible(e.target.checked)} /> TVA déductible
                      </label>
                      {err && <p className="text-sm text-red-400">{err}</p>}
                    </>
                  )}
                </div>
              </div>
            </div>
            {phase !== "analyzing" && (
              <div className="border-t border-white/[0.06] p-4 flex items-center justify-between gap-3">
                <button onClick={reset} disabled={phase === "saving"}
                  className="text-sm text-white/45 hover:text-white disabled:opacity-30">Annuler</button>
                <div className="flex items-center gap-2">
                  {amountHt && (
                    <span className="text-xs text-white/40">TTC ≈ <strong className="text-white">{(parseFloat(amountHt.replace(",", ".")) * (1 + parseFloat(vatRatePct) / 100)).toFixed(2)} €</strong></span>
                  )}
                  <button onClick={save} disabled={!valid || phase === "saving"}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-40 transition-colors">
                    {phase === "saving" ? "Enregistrement…" : "✓ Enregistrer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Helper : appel SSE de l'extraction IA avec progression en direct
// ═════════════════════════════════════════════════════════════════════════
type ExtractResult = {
  supplier?: string | null; label?: string | null; dateIssued?: string | null;
  amountHt?: number | null; vatRatePct?: number | null; suggestedCategory?: string | null;
  error?: string;
};

async function streamExtract(
  file: File,
  signal: AbortSignal,
  onDelta: (info: { chars: number; snippet: string }) => void,
): Promise<ExtractResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/charges/extract", { method: "POST", body: fd, signal });
  if (!res.ok || !res.body) {
    // Anciens endpoints renvoient JSON simple
    const j = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    return { error: j.error ?? `HTTP ${res.status}` };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let final: ExtractResult | null = null;
  let errMsg: string | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // Parse les évènements SSE séparés par "\n\n"
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const evtBlock = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const lines = evtBlock.split("\n");
      let event = "message"; let data = "";
      for (const ln of lines) {
        if (ln.startsWith("event:")) event = ln.slice(6).trim();
        else if (ln.startsWith("data:")) data += ln.slice(5).trim();
      }
      if (!data) continue;
      try {
        const obj = JSON.parse(data);
        if (event === "delta") onDelta({ chars: obj.chars ?? 0, snippet: obj.snippet ?? "" });
        else if (event === "done") final = obj;
        else if (event === "error") errMsg = obj.error;
      } catch { /* ignore */ }
    }
  }
  if (final) return final;
  return { error: errMsg ?? "Flux interrompu" };
}

function escapeCsv(s: string): string {
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
