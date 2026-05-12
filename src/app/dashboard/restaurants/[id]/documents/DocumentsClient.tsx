"use client";

import { useState, useRef } from "react";
import DocumentTemplate, { type DocType } from "../../../documents/DocumentTemplate";
import { printDocumentNode } from "../../../documents/printUtil";
import { computeQuote, MODULES, DURATIONS, type DurationKey } from "../../../documents/pricing";

type RestaurantData = {
  name: string;
  address: string;
  siret: string;
  managerName: string;
  email: string;
  phone: string;
  slug: string;
};

type Modules = {
  avis: boolean;
  qr: boolean;
  server: boolean;
  stock: boolean;
  finance: boolean;
  contab: boolean;
  reservations: boolean;
};

// Style commun pour les inputs/textareas du sidebar (corrige le bug blanc-sur-blanc)
const INPUT_CLS = "w-full border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg p-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";
const INPUT_CLIENT_CLS = INPUT_CLS + " border-orange-700/40 bg-orange-950/30";

export default function DocumentsClient({ restaurantId, restaurant }: { restaurantId: string; restaurant: RestaurantData }) {
  const [docType, setDocType] = useState<"contrat" | "prestation" | "devis" | "facture" | "cgvu" | "onboarding" | "tarification" | "plaquette" | "flyer">("contrat");
  const [engagement, setEngagement] = useState<DurationKey>("12m");
  // Modules sélectionnés — "avis" est requis donc toujours inclus
  const [selectedModules, setSelectedModules] = useState<string[]>(["avis"]);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleModule = (id: string) => {
    if (id === "avis") return; // requis, ne se désélectionne pas
    setSelectedModules((cur) =>
      cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id]
    );
  };

  // États éditables — Client (le restaurant / l'établissement)
  const [clientData, setClientData] = useState(restaurant);

  // États éditables — Prestataire (le vendeur / signataire MaTable)
  // NB : les champs vides afficheront un placeholder "[… — à compléter]" dans les docs
  const [vendor, setVendor] = useState({
    raisonSociale: "Ma Table",
    formeJuridique: "Auto-entrepreneur",
    siret: "",                  // sera affiché "[N° SIRET — IMAT en cours]" si vide
    rcs: "",                    // facultatif pour auto-entrepreneur
    codeAPE: "6201Z — Programmation informatique",
    tvaIntracom: "",            // affichera "Non assujetti (art. 293B CGI)" si vide
    address: "France",
    email: "contact@matable.pro",
    phone: "+33 7 57 83 57 77",
    representant: "Steven Franco",
    iban: "",
    bic: "",
  });

  const [docMeta, setDocMeta] = useState({
    numero: `CONT-2026-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
    date: new Date().toLocaleDateString("fr-FR"),
    validite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
    echeance: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toLocaleDateString("fr-FR"),
    periode: `01/${new Date().getMonth() + 1 < 10 ? '0'+(new Date().getMonth() + 1) : new Date().getMonth() + 1} — ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}/${new Date().getMonth() + 1 < 10 ? '0'+(new Date().getMonth() + 1) : new Date().getMonth() + 1}`,
  });

  // Contrat de prestation transitoire (avant IMAT société) — mensuel sans engagement
  const [prestation, setPrestation] = useState({
    description: "Mise à disposition mensuelle de la plateforme Ma Table (tous modules) et accompagnement à l'usage. Prestation transitoire conclue en attendant l'immatriculation de la société du Prestataire.",
    montantHT: 79,
    modalites: "Paiement mensuel à terme à échoir par virement bancaire ou espèces, le 1er de chaque mois.",
    delaiLivraison: "Mise en service sous 7 jours après signature et premier paiement.",
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const typeLabels: Record<string, string> = {
    contrat: "Contrat d'abonnement",
    prestation: "Contrat de prestation",
    devis: "Devis",
    facture: "Facture",
    cgvu: "CGV / CGU",
    onboarding: "Fiche Onboarding",
    tarification: "Fiche Tarification & Suivi",
    plaquette: "Plaquette commerciale",
    flyer: "Flyer démo",
  };

  const saveToClasseur = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      // Montant à archiver (en centimes) selon le type
      let totalCents = 0;
      if (docType === "contrat" || docType === "facture") {
        totalCents = Math.round(priceInfo.monthly * 100);
      } else if (docType === "devis") {
        totalCents = Math.round(priceInfo.total * 100);
      } else if (docType === "prestation") {
        totalCents = Math.round(prestation.montantHT * 100);
      } else if (docType === "tarification") {
        totalCents = Math.round(priceInfo.monthly * 100);
      }
      const title = `${typeLabels[docType] ?? docType} — ${clientData.name || "Sans nom"}`;
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          type: docType,
          number: docMeta.numero,
          title,
          totalCents,
          vendor,
          client: clientData,
          data: { engagement, selectedModules, docMeta, prestation },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSaveMsg({ type: "ok", text: "Document enregistré dans le classeur ✓" });
    } catch (e: any) {
      setSaveMsg({ type: "err", text: e.message ?? "Erreur" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const generatePDF = () => {
    const element = printRef.current;
    if (!element) return;
    printDocumentNode(element, `${docMeta.numero} — ${clientData.name || "MaTable"}`);
  };

  // Quote complet calculé en direct depuis les modules + engagement sélectionnés
  const priceInfo = computeQuote(selectedModules, engagement);

  return (
    <div className="flex gap-8 items-start">
      {/* Sidebar Configuration */}
      <div className="w-80 bg-slate-900 p-6 rounded-xl border border-slate-800 shrink-0 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <h3 className="font-bold mb-4 pb-2 border-b border-slate-800 text-slate-100">Éditeur de document</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Type de document</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className={INPUT_CLS}
            >
              <optgroup label="📑 Contrats & Facturation">
                <option value="contrat">Contrat d'Abonnement</option>
                <option value="prestation">Contrat de Prestation (transitoire)</option>
                <option value="devis">Devis</option>
                <option value="facture">Facture</option>
              </optgroup>
              <optgroup label="📋 Documents légaux & internes">
                <option value="cgvu">CGV / CGU</option>
                <option value="onboarding">Fiche Onboarding</option>
                <option value="tarification">Fiche Tarification & Suivi</option>
              </optgroup>
              <optgroup label="🎯 Commercial (à laisser au prospect)">
                <option value="plaquette">Plaquette commerciale</option>
                <option value="flyer">Flyer démo</option>
              </optgroup>
            </select>
          </div>

          {(docType === "contrat" || docType === "devis" || docType === "facture" || docType === "tarification") && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Engagement</label>
                <select
                  value={engagement}
                  onChange={(e) => setEngagement(e.target.value as any)}
                  className={INPUT_CLS}
                >
                  {DURATIONS.map((d) => (
                    <option key={d.key} value={d.key}>{d.label} — {d.sub} (×{d.realMult.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Modules souscrits</label>
                <div className="space-y-1.5">
                  {MODULES.map((m) => {
                    const isSelected = selectedModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                          isSelected ? "bg-orange-500/10 border border-orange-500/30" : "bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800"
                        } ${m.required ? "opacity-90 cursor-default" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleModule(m.id)}
                          disabled={m.required}
                          className="mt-0.5 accent-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-bold text-slate-100">{m.name}</span>
                            <span className="text-orange-400 font-mono text-[10px] whitespace-nowrap">{m.price} €</span>
                          </div>
                          {m.required && <span className="text-[9px] uppercase text-orange-400 tracking-wider">Requis</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Récap live du total */}
                <div className="mt-3 p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs">
                  <div className="flex justify-between text-slate-400"><span>Sous-total HT</span><span>{priceInfo.subtotal?.toFixed(2)} €</span></div>
                  {(priceInfo.volumePercent ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-400"><span>Remise volume ({priceInfo.volumePercent} %)</span><span>−{priceInfo.volumeAmount?.toFixed(2)} €</span></div>
                  )}
                  <div className="flex justify-between text-orange-400 font-black border-t border-slate-700 mt-1 pt-1"><span>HT / mois</span><span>{priceInfo.monthly.toFixed(2)} €</span></div>
                  <div className="flex justify-between text-slate-500 text-[10px]"><span>Total période ({priceInfo.durationLabel})</span><span>{priceInfo.total.toFixed(2)} €</span></div>
                  {priceInfo.isAnnualPay && (
                    <div className="flex justify-between text-orange-300 text-[10px] mt-1"><span>→ Annuel à la signature</span><span>{priceInfo.annualPayTotal?.toFixed(2)} €</span></div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">N° Document</label>
            <input
              type="text"
              value={docMeta.numero}
              onChange={(e) => setDocMeta({...docMeta, numero: e.target.value})}
              className={INPUT_CLS}
            />
          </div>

          {/* ─── Prestataire (vendeur MaTable) ─────────────────────────── */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Prestataire (vendeur)</label>
            <input type="text" value={vendor.raisonSociale} placeholder="Raison sociale" onChange={(e) => setVendor({...vendor, raisonSociale: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.formeJuridique} placeholder="Forme juridique (ex. Auto-entrepreneur)" onChange={(e) => setVendor({...vendor, formeJuridique: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.representant} placeholder="Nom du signataire" onChange={(e) => setVendor({...vendor, representant: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.siret} placeholder="SIRET (laisser vide si IMAT en cours)" onChange={(e) => setVendor({...vendor, siret: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.rcs} placeholder="RCS (facultatif)" onChange={(e) => setVendor({...vendor, rcs: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.codeAPE} placeholder="Code APE / NAF" onChange={(e) => setVendor({...vendor, codeAPE: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.tvaIntracom} placeholder="TVA intracom. (laisser vide si 293B)" onChange={(e) => setVendor({...vendor, tvaIntracom: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.address} placeholder="Adresse" onChange={(e) => setVendor({...vendor, address: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.email} placeholder="Email" onChange={(e) => setVendor({...vendor, email: e.target.value})} className={INPUT_CLS} />
            <input type="text" value={vendor.phone} placeholder="Téléphone" onChange={(e) => setVendor({...vendor, phone: e.target.value})} className={INPUT_CLS} />
            {(docType === "facture" || docType === "contrat") && (
              <>
                <input type="text" value={vendor.iban} placeholder="IBAN" onChange={(e) => setVendor({...vendor, iban: e.target.value})} className={INPUT_CLS} />
                <input type="text" value={vendor.bic} placeholder="BIC" onChange={(e) => setVendor({...vendor, bic: e.target.value})} className={INPUT_CLS} />
              </>
            )}
          </div>

          {/* ─── Client (chef établissement) ──────────────────────────── */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Client (chef établissement)</label>
            <input type="text" value={clientData.name} placeholder="Nom de l'établissement" onChange={(e) => setClientData({...clientData, name: e.target.value})} className={INPUT_CLIENT_CLS} />
            <input type="text" value={clientData.managerName} placeholder="Nom du chef / gérant" onChange={(e) => setClientData({...clientData, managerName: e.target.value})} className={INPUT_CLIENT_CLS} />
            <input type="text" value={clientData.address} placeholder="Adresse" onChange={(e) => setClientData({...clientData, address: e.target.value})} className={INPUT_CLIENT_CLS} />
            <input type="text" value={clientData.siret} placeholder="SIRET" onChange={(e) => setClientData({...clientData, siret: e.target.value})} className={INPUT_CLIENT_CLS} />
            <input type="text" value={clientData.email} placeholder="Email" onChange={(e) => setClientData({...clientData, email: e.target.value})} className={INPUT_CLIENT_CLS} />
            <input type="text" value={clientData.phone} placeholder="Téléphone" onChange={(e) => setClientData({...clientData, phone: e.target.value})} className={INPUT_CLIENT_CLS} />
          </div>

          {/* ─── Prestation (ponctuelle) ──────────────────────────────── */}
          {docType === "prestation" && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Détails prestation</label>
              <textarea
                value={prestation.description}
                onChange={(e) => setPrestation({...prestation, description: e.target.value})}
                rows={3}
                placeholder="Description de la prestation"
                className={INPUT_CLS}
              />
              <input type="number" value={prestation.montantHT} placeholder="Montant HT (€)" onChange={(e) => setPrestation({...prestation, montantHT: Number(e.target.value)})} className={INPUT_CLS} />
              <input type="text" value={prestation.modalites} placeholder="Modalités de paiement" onChange={(e) => setPrestation({...prestation, modalites: e.target.value})} className={INPUT_CLS} />
              <input type="text" value={prestation.delaiLivraison} placeholder="Délai de livraison" onChange={(e) => setPrestation({...prestation, delaiLivraison: e.target.value})} className={INPUT_CLS} />
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={saveToClasseur}
              disabled={saving}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "💾 Enregistrer dans le classeur"}
            </button>
            <button
              onClick={generatePDF}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors"
            >
              🖨 Imprimer / Enregistrer PDF
            </button>
            {saveMsg && (
              <div className={`text-xs font-semibold p-2 rounded-lg ${
                saveMsg.type === "ok"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}>
                {saveMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rendu du document (A4 scale) */}
      <div className="flex-1 bg-gray-100 p-8 rounded-xl overflow-x-auto flex justify-center">
        <DocumentTemplate
          ref={printRef}
          docType={docType as DocType}
          vendor={vendor}
          clientData={clientData}
          docMeta={docMeta}
          engagement={engagement}
          prestation={prestation}
          priceInfo={priceInfo}
        />
      </div>
    </div>
  );
}
