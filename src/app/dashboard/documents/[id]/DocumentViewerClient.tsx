"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentTemplate, {
  type DocType,
  type Vendor,
  type ClientData,
  type DocMeta,
  type Prestation,
} from "../DocumentTemplate";
import { computeQuote, type DurationKey } from "../pricing";
import { printDocumentNode } from "../printUtil";

type Doc = {
  id: string;
  type: string;
  number: string;
  title: string;
  vendor: Vendor;
  client: ClientData;
  data: { engagement?: string; selectedModules?: string[]; docMeta?: DocMeta; prestation?: Prestation; chainQuote?: any };
  restaurantName: string;
  signedAt: string | null;
};

export default function DocumentViewerClient({ doc }: { doc: Doc }) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"pdf" | "sign" | "delete" | null>(null);
  const [signed, setSigned] = useState<string | null>(doc.signedAt);

  const engagement = (doc.data?.engagement ?? "12m") as DurationKey;
  // Rétro-compat : si selectedModules absent (anciens docs), on suppose le plan "avis" seul
  const selectedModules = doc.data?.selectedModules ?? ["avis"];
  const docMeta: DocMeta = doc.data?.docMeta ?? {
    numero: doc.number,
    date: new Date().toLocaleDateString("fr-FR"),
    validite: "",
    echeance: "",
    periode: "",
  };
  const prestation: Prestation = doc.data?.prestation ?? {
    description: "",
    montantHT: 0,
    modalites: "",
    delaiLivraison: "",
  };
  const priceInfo = computeQuote(selectedModules, engagement);

  const exportPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setBusy("pdf");
    try {
      printDocumentNode(element, `${doc.number} — ${doc.restaurantName}`);
    } finally {
      // Le dialog d'impression s'ouvre immédiatement, on libère le bouton après un court délai
      setTimeout(() => setBusy(null), 600);
    }
  };

  const toggleSigned = async () => {
    setBusy("sign");
    const newSigned = signed ? null : new Date().toISOString();
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedAt: newSigned }),
    });
    if (res.ok) setSigned(newSigned);
    setBusy(null);
  };

  const deleteDoc = async () => {
    if (!confirm("Supprimer définitivement ce document ?")) return;
    setBusy("delete");
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/documents");
    else setBusy(null);
  };

  return (
    <div className="flex gap-6 items-start flex-wrap">
      {/* Sidebar actions */}
      <div className="w-72 bg-slate-900 p-5 rounded-xl border border-slate-800 sticky top-6">
        <h3 className="font-bold mb-4 pb-2 border-b border-slate-800 text-slate-100">Actions</h3>
        <div className="space-y-2">
          <button
            onClick={exportPDF}
            disabled={!!busy}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {busy === "pdf" ? "Ouverture…" : "🖨 Imprimer / Enregistrer PDF"}
          </button>
          <button
            onClick={toggleSigned}
            disabled={!!busy}
            className={`w-full font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${
              signed
                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {busy === "sign" ? "…" : signed ? "✓ Signé" : "Marquer signé"}
          </button>
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={deleteDoc}
              disabled={!!busy}
              className="w-full text-xs text-red-400 hover:text-red-300 py-2"
            >
              🗑 Supprimer ce document
            </button>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <p><span className="text-slate-400">Type :</span> {doc.type}</p>
          <p><span className="text-slate-400">N° :</span> {doc.number}</p>
          <p><span className="text-slate-400">Client :</span> {doc.restaurantName}</p>
        </div>
      </div>

      {/* Rendu A4 */}
      <div className="flex-1 bg-gray-100 p-8 rounded-xl overflow-x-auto flex justify-center min-w-0">
        <DocumentTemplate
          ref={printRef}
          docType={doc.type as DocType}
          vendor={doc.vendor}
          clientData={doc.client}
          docMeta={docMeta}
          engagement={engagement}
          prestation={prestation}
          priceInfo={priceInfo}
          chainQuote={doc.data?.chainQuote}
        />
      </div>
    </div>
  );
}
