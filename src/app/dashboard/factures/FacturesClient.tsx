"use client";
import { useMemo, useState } from "react";
import { printDocumentNode } from "../documents/printUtil";

export type Invoice = {
  id: string;
  createdAt: string | Date;
  restaurantName: string | null;
  restaurantId: string;
  plan: string;
  method: string | null;
  amountCents: number;
  interval: string | null;
  invoiceNumber: string | null;
  stripeInvoiceUrl: string | null;
  note: string | null;
};

const PLAN_LABEL: Record<string, string> = { STARTER: "Starter", PRO: "Pro", PRO_IA: "Business" };
const METHOD_LABEL: Record<string, string> = {
  stripe: "Stripe", cheque: "Chèque", especes: "Espèces", virement: "Virement", manual: "Manuel", autre: "Autre",
};
const TVA_RATE = 0.20;

function eur(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
function fdate(d: string | Date) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function FacturesClient({ invoices }: { invoices: Invoice[] }) {
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter((i) => {
      if (method !== "all" && (i.method ?? "") !== method) return false;
      if (!term) return true;
      return (
        (i.restaurantName ?? "").toLowerCase().includes(term) ||
        (i.invoiceNumber ?? "").toLowerCase().includes(term)
      );
    });
  }, [invoices, q, method]);

  const totalCents = filtered.reduce((s, i) => s + i.amountCents, 0);

  function exportPdf(inv: Invoice) {
    const ht = inv.amountCents;
    const tva = Math.round(ht * TVA_RATE);
    const ttc = ht + tva;
    const node = document.createElement("div");
    node.className = "matable-print-doc";
    node.style.cssText = "width:210mm;min-height:297mm;padding:18mm 16mm;box-sizing:border-box;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;margin:0 auto";
    node.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #ea580c;padding-bottom:16px;margin-bottom:24px">
        <div>
          <div style="font-size:26px;font-weight:900;color:#111">Ma<span style="color:#ea580c">Table</span>.Pro</div>
          <div style="font-size:11px;color:#666;margin-top:4px">contact@matable.pro · matable.pro</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:900;color:#ea580c">FACTURE</div>
          <div style="font-size:12px;color:#333;margin-top:4px"><strong>${inv.invoiceNumber ?? inv.id.slice(0, 12)}</strong></div>
          <div style="font-size:12px;color:#666">Date : ${fdate(inv.createdAt)}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:24px">
        <div style="font-size:12px;color:#333">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px">Émetteur</div>
          <div style="font-weight:700">MaTable.Pro</div>
          <div style="color:#666">Logiciel de gestion pour restaurants</div>
        </div>
        <div style="font-size:12px;color:#333;text-align:right">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px">Client</div>
          <div style="font-weight:700">${inv.restaurantName ?? "Restaurant"}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="text-align:left;padding:10px;border-bottom:2px solid #ddd">Désignation</th>
            <th style="text-align:center;padding:10px;border-bottom:2px solid #ddd">Période</th>
            <th style="text-align:right;padding:10px;border-bottom:2px solid #ddd">Montant HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #eee">
              Abonnement MaTable.Pro — forfait <strong>${PLAN_LABEL[inv.plan] ?? inv.plan}</strong>
            </td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${inv.interval === "yearly" ? "Annuel" : "Mensuel"}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${eur(ht)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
        <table style="font-size:12px;min-width:240px">
          <tr><td style="padding:4px 12px;color:#666">Total HT</td><td style="padding:4px 0;text-align:right">${eur(ht)}</td></tr>
          <tr><td style="padding:4px 12px;color:#666">TVA (20 %)</td><td style="padding:4px 0;text-align:right">${eur(tva)}</td></tr>
          <tr style="font-size:14px;font-weight:900;border-top:2px solid #ea580c">
            <td style="padding:8px 12px">Total TTC</td><td style="padding:8px 0;text-align:right;color:#ea580c">${eur(ttc)}</td>
          </tr>
        </table>
      </div>

      <div style="font-size:12px;color:#333;background:#f8f8f8;border-left:3px solid #ea580c;padding:12px 14px;margin-bottom:16px">
        <strong>Réglé</strong> par ${METHOD_LABEL[inv.method ?? "autre"] ?? inv.method} le ${fdate(inv.createdAt)}.
        ${inv.note ? `<br/>Réf. : ${inv.note}` : ""}
      </div>

      <div style="font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px">
        Document généré par MaTable.Pro. Mentions légales (SIRET, TVA intracom., adresse) à compléter
        dans la configuration le cas échéant.
      </div>
    `;
    printDocumentNode(node, `Facture ${inv.invoiceNumber ?? inv.id}`);
  }

  return (
    <div className="space-y-4">
      {/* Filtres + total */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher resto ou n° facture…"
          className="flex-1 min-w-48 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
        <select value={method} onChange={(e) => setMethod(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="all">Tous moyens</option>
          <option value="stripe">Stripe</option>
          <option value="cheque">Chèque</option>
          <option value="especes">Espèces</option>
          <option value="virement">Virement</option>
          <option value="autre">Autre</option>
        </select>
        <div className="ml-auto text-sm text-slate-300">
          <span className="text-slate-500">{filtered.length} facture(s) · Total&nbsp;</span>
          <strong className="text-emerald-400">{eur(totalCents)}</strong>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">N° facture</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Forfait</th>
              <th className="px-4 py-3">Moyen</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                Aucune facture. Elles apparaîtront ici dès qu'un paiement (Stripe ou manuel) sera enregistré.
              </td></tr>
            ) : filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-white/80">{inv.invoiceNumber ?? inv.id.slice(0, 10)}</td>
                <td className="px-4 py-3 text-slate-400">{fdate(inv.createdAt)}</td>
                <td className="px-4 py-3 font-medium">{inv.restaurantName ?? "—"}</td>
                <td className="px-4 py-3">{PLAN_LABEL[inv.plan] ?? inv.plan}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{METHOD_LABEL[inv.method ?? "autre"] ?? inv.method}</span>
                </td>
                <td className="px-4 py-3 text-right font-bold">{eur(inv.amountCents)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => exportPdf(inv)}
                    className="text-orange-400 hover:underline text-xs font-semibold">📄 PDF</button>
                  {inv.stripeInvoiceUrl && (
                    <a href={inv.stripeInvoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="ml-3 text-blue-400 hover:underline text-xs">Stripe ↗</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
