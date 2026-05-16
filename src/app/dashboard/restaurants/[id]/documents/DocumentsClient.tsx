"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
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
  const [docType, setDocType] = useState<"contrat" | "prestation" | "devis" | "devis-chaine" | "facture" | "cgvu" | "onboarding" | "tarification" | "plaquette" | "plaquette-eco" | "plaquette-premium" | "plaquette-compact" | "plaquette-chaine" | "flyer" | "tuto-avis">("contrat");
  const [engagement, setEngagement] = useState<DurationKey>("12m");
  // Modules sélectionnés — "avis" est requis donc toujours inclus
  const [selectedModules, setSelectedModules] = useState<string[]>(["avis"]);
  const printRef = useRef<HTMLDivElement>(null);

  // ── NFC / QR pour tuto-avis ──────────────────────────────────────────────
  const [nfcQrCode, setNfcQrCode] = useState<string | null>(null);
  const [nfcWriting, setNfcWriting] = useState(false);
  const [nfcWritten, setNfcWritten] = useState(false);
  const reviewUrl = restaurant.slug ? `https://matable.pro/r/${restaurant.slug}/review` : null;

  useEffect(() => {
    if (docType !== "tuto-avis" || !reviewUrl) { setNfcQrCode(null); return; }
    QRCode.toDataURL(reviewUrl, {
      width: 300, margin: 1,
      color: { dark: "#ffffff", light: "#0a0a0a" },
    }).then(setNfcQrCode).catch(() => {});
  }, [docType, reviewUrl]);

  const printStickerQR = (qrDataUrl: string, label: string = restaurant.name) => {
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    // 3 identical stickers — optimized for label/sticker printers (62mm rolls etc.)
    const stickerHtml = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Autocollants QR Avis — ${label}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; font-family: 'Helvetica Neue', Arial, sans-serif; }
        @media print {
          body { margin: 0; }
          .sticker { break-inside: avoid; page-break-inside: avoid; }
        }
        .page { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 20px; }
        .sticker {
          display: flex; flex-direction: column; align-items: center;
          width: 200px; border: 1.5px dashed #ccc; border-radius: 16px;
          padding: 18px 16px 14px; background: #fff; gap: 10px;
        }
        .headline {
          font-size: 13px; font-weight: 900; color: #111; text-align: center;
          letter-spacing: -0.3px; line-height: 1.25;
        }
        .stars { font-size: 18px; letter-spacing: 2px; }
        .qr img { width: 130px; height: 130px; display: block; }
        .cta {
          font-size: 11px; font-weight: 700; color: #f97316;
          text-align: center; letter-spacing: 0.5px; text-transform: uppercase;
        }
        .brand {
          font-size: 9px; color: #94a3b8; font-weight: 600;
          letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;
        }
        .sep { width: 80%; height: 1px; background: #f1f5f9; }
      </style>
      </head><body>
      <div class="page">
        ${[0,1,2].map(() => `
        <div class="sticker">
          <p class="headline">⭐ Donnez-nous<br>un avis !</p>
          <p class="stars">⭐⭐⭐⭐⭐</p>
          <div class="sep"></div>
          <div class="qr"><img src="${qrDataUrl}" alt="QR avis"/></div>
          <div class="sep"></div>
          <p class="cta">Scannez &amp; laissez votre avis</p>
          <p class="brand">MaTable.Pro — ${label}</p>
        </div>
        `).join("")}
      </div>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`;
    win.document.write(stickerHtml);
    win.document.close();
  };

  const writeNfc = async () => {
    if (!reviewUrl) return;
    if (!("NDEFReader" in window)) {
      alert("L'écriture NFC n'est disponible que sur Chrome pour Android.");
      return;
    }
    try {
      setNfcWriting(true);
      const ndef = new (window as any).NDEFReader();
      await ndef.write({ records: [{ recordType: "url", data: reviewUrl }] });
      setNfcWritten(true);
      setTimeout(() => setNfcWritten(false), 3000);
    } catch (err: any) {
      alert(`Écriture NFC annulée : ${err.message ?? "Erreur inconnue"}`);
    } finally {
      setNfcWriting(false);
    }
  };

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
    raisonSociale: "MaTable.Pro",
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

  // Devis Chaîne — lignes saisies à la main par l'admin
  const [chainQuote, setChainQuote] = useState<{
    establishments: Array<{ id: string; name: string; city: string; modules: string[]; engagement: string; monthlyHt: number; notes: string }>;
    groupDiscountPercent: number;
    setupFeeHt: number;
    notes: string;
  }>({
    establishments: [],
    groupDiscountPercent: 0,
    setupFeeHt: 0,
    notes: "",
  });

  const addChainEstablishment = () => {
    setChainQuote((q) => ({
      ...q,
      establishments: [
        ...q.establishments,
        { id: Math.random().toString(36).slice(2, 9), name: "", city: "", modules: ["avis"], engagement: "12m", monthlyHt: 79, notes: "" },
      ],
    }));
  };
  const removeChainEstablishment = (id: string) => {
    setChainQuote((q) => ({ ...q, establishments: q.establishments.filter((e) => e.id !== id) }));
  };
  const updateChainEstablishment = (id: string, patch: Partial<typeof chainQuote.establishments[0]>) => {
    setChainQuote((q) => ({
      ...q,
      establishments: q.establishments.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  };

  // Contrat de prestation transitoire (avant IMAT société) — mensuel sans engagement
  const [prestation, setPrestation] = useState({
    description: "Mise à disposition mensuelle de la plateforme MaTable.Pro (tous modules) et accompagnement à l'usage. Prestation transitoire conclue en attendant l'immatriculation de la société du Prestataire.",
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
    "plaquette-eco": "Plaquette éco",
    "plaquette-premium": "Plaquette premium",
    "plaquette-compact": "Plaquette compacte A5",
    "plaquette-chaine": "Plaquette Chaîne (sur devis)",
    "devis-chaine": "Devis Chaîne / Groupe",
    flyer: "Flyer démo",
    "tuto-avis": "Plaquette Tuto Avis",
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
      } else if (docType === "devis-chaine") {
        const sub = chainQuote.establishments.reduce((s, e) => s + (e.monthlyHt || 0), 0);
        const net = sub - sub * (chainQuote.groupDiscountPercent / 100);
        totalCents = Math.round(net * 100);
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
          data: { engagement, selectedModules, docMeta, prestation, chainQuote },
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
                <option value="devis">Devis (mono-établissement)</option>
                <option value="devis-chaine">Devis Chaîne / Groupe</option>
                <option value="facture">Facture</option>
              </optgroup>
              <optgroup label="📋 Documents légaux & internes">
                <option value="cgvu">CGV / CGU</option>
                <option value="onboarding">Fiche Onboarding</option>
                <option value="tarification">Fiche Tarification & Suivi</option>
              </optgroup>
              <optgroup label="🎯 Commercial (à laisser au prospect)">
                <option value="plaquette">Plaquette — Standard (A4 perso)</option>
                <option value="plaquette-eco">Plaquette — Éco encre (A4 perso)</option>
                <option value="plaquette-premium">Plaquette — Premium (A4 perso, gros prospect)</option>
                <option value="plaquette-compact">Plaquette — Compacte A5 (porte-à-porte)</option>
                <option value="plaquette-chaine">Plaquette — Chaîne / Groupe (sur devis)</option>
                <option value="flyer">Flyer démo (A4, 2 par page, générique)</option>
                <option value="tuto-avis">Plaquette Tuto Avis (guide A à Z — premiers avis Google)</option>
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
                    <option key={d.key} value={d.key}>
                      {d.label} — {d.displayDiscount === 0 ? "prix de base" : `−${d.displayDiscount} %`}{d.sub ? ` · ${d.sub}` : ""}
                    </option>
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

          {/* ─── Devis Chaîne : édition multi-établissements ────────────── */}
          {docType === "devis-chaine" && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Établissements du groupe ({chainQuote.establishments.length})</label>
                <button
                  type="button"
                  onClick={addChainEstablishment}
                  className="text-xs px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded font-bold"
                >
                  + Ajouter
                </button>
              </div>

              {chainQuote.establishments.length === 0 && (
                <p className="text-xs text-slate-500 italic py-3 text-center bg-slate-800/40 rounded-lg border border-slate-700/40">
                  Aucun établissement. Cliquez "+ Ajouter" pour commencer.
                </p>
              )}

              {chainQuote.establishments.map((e, i) => (
                <div key={e.id} className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">#{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeChainEstablishment(e.id)}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      ✕ Retirer
                    </button>
                  </div>
                  <input
                    type="text" value={e.name} placeholder="Nom de l'établissement"
                    onChange={(ev) => updateChainEstablishment(e.id, { name: ev.target.value })}
                    className={INPUT_CLS + " text-xs"}
                  />
                  <input
                    type="text" value={e.city} placeholder="Ville"
                    onChange={(ev) => updateChainEstablishment(e.id, { city: ev.target.value })}
                    className={INPUT_CLS + " text-xs"}
                  />
                  <select
                    value={e.engagement}
                    onChange={(ev) => updateChainEstablishment(e.id, { engagement: ev.target.value })}
                    className={INPUT_CLS + " text-xs"}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Modules</p>
                    <div className="flex flex-wrap gap-1">
                      {MODULES.map((mod) => {
                        const isSel = e.modules.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => {
                              if (mod.required) return;
                              const next = isSel ? e.modules.filter((x) => x !== mod.id) : [...e.modules, mod.id];
                              updateChainEstablishment(e.id, { modules: next });
                            }}
                            disabled={mod.required}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              isSel
                                ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                                : "bg-slate-900 text-slate-500 border-slate-700 hover:bg-slate-800"
                            } ${mod.required ? "opacity-90" : ""}`}
                            title={mod.required ? "Module requis" : ""}
                          >
                            {mod.name.split(" ")[0]}{mod.required && "*"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step="0.01" value={e.monthlyHt}
                      onChange={(ev) => updateChainEstablishment(e.id, { monthlyHt: Number(ev.target.value) || 0 })}
                      className={INPUT_CLS + " text-xs"}
                      placeholder="HT/mois"
                    />
                    <span className="text-xs text-slate-400">€/mois</span>
                  </div>
                  <input
                    type="text" value={e.notes} placeholder="Notes (optionnel)"
                    onChange={(ev) => updateChainEstablishment(e.id, { notes: ev.target.value })}
                    className={INPUT_CLS + " text-[10px]"}
                  />
                </div>
              ))}

              <div className="pt-2 border-t border-slate-700/40 space-y-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Remise groupe (%)</label>
                  <input
                    type="number" min="0" max="100" value={chainQuote.groupDiscountPercent}
                    onChange={(ev) => setChainQuote((q) => ({ ...q, groupDiscountPercent: Number(ev.target.value) || 0 }))}
                    className={INPUT_CLS + " text-xs"}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Frais d'installation groupe (€ HT)</label>
                  <input
                    type="number" min="0" step="0.01" value={chainQuote.setupFeeHt}
                    onChange={(ev) => setChainQuote((q) => ({ ...q, setupFeeHt: Number(ev.target.value) || 0 }))}
                    className={INPUT_CLS + " text-xs"}
                  />
                </div>
                <textarea
                  value={chainQuote.notes} placeholder="Note libre (apparaît dans les conditions)"
                  onChange={(ev) => setChainQuote((q) => ({ ...q, notes: ev.target.value }))}
                  rows={2}
                  className={INPUT_CLS + " text-[10px]"}
                />

                {/* Récap live */}
                {chainQuote.establishments.length > 0 && (() => {
                  const sub = chainQuote.establishments.reduce((s, e) => s + (e.monthlyHt || 0), 0);
                  const disc = sub * (chainQuote.groupDiscountPercent / 100);
                  const net = sub - disc;
                  return (
                    <div className="mt-2 p-2 bg-slate-900 border border-slate-700 rounded text-xs">
                      <div className="flex justify-between text-slate-400"><span>Sous-total</span><span>{sub.toFixed(2)} €</span></div>
                      {chainQuote.groupDiscountPercent > 0 && (
                        <div className="flex justify-between text-emerald-400"><span>Remise</span><span>−{disc.toFixed(2)} €</span></div>
                      )}
                      <div className="flex justify-between text-orange-400 font-black border-t border-slate-700 mt-1 pt-1"><span>HT/mois</span><span>{net.toFixed(2)} €</span></div>
                      <div className="flex justify-between text-slate-500 text-[10px]"><span>HT/an (×12)</span><span>{(net * 12).toFixed(2)} €</span></div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

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

          {/* ── Section NFC/QR — Tuto Avis seulement ── */}
          {docType === "tuto-avis" && reviewUrl && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">🪪 Carte NFC & QR Code restaurant</p>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                <span className="font-mono text-[10px] text-slate-400 flex-1 truncate">{reviewUrl}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(reviewUrl)}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors shrink-0 font-semibold"
                >
                  📋
                </button>
              </div>

              {nfcQrCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-700 rounded-xl">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-600 shrink-0 bg-black flex items-center justify-center">
                      <img src={nfcQrCode} alt="QR restaurant" className="w-full h-full" />
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <p className="text-xs text-slate-400 leading-relaxed">QR global du restaurant — tables, cartes NFC, autocollants.</p>
                      <a
                        href={nfcQrCode}
                        download={`qr-avis-${restaurant.slug || "restaurant"}.png`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                      >
                        ⬇ PNG
                      </a>
                    </div>
                  </div>
                  {/* Sticker print button */}
                  <button
                    type="button"
                    onClick={() => printStickerQR(nfcQrCode, restaurant.name)}
                    className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold px-3 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 rounded-xl text-orange-300 transition-colors"
                  >
                    🖨️ Imprimer autocollants ×3
                    <span className="text-[10px] text-orange-400/60 font-normal">"Donnez-nous un avis !"</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  Génération du QR…
                </div>
              )}

              <button
                type="button"
                onClick={writeNfc}
                disabled={nfcWriting}
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-lg text-blue-300 transition-colors disabled:opacity-60"
              >
                {nfcWriting ? (
                  <><span className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin shrink-0" /> Approchez la carte NFC…</>
                ) : nfcWritten ? "✅ Carte encodée !" : "📱 Encoder la carte NFC"}
              </button>

              <p className="text-[10px] text-slate-600 leading-relaxed">
                ⚠ Encodage NFC réservé à <strong className="text-slate-500">Chrome sur Android</strong>. Sur iPhone, utilisez l'app <em>NFC Tools</em> et collez l'URL ci-dessus.
              </p>
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
          chainQuote={chainQuote}
          tutoQrCode={nfcQrCode ?? undefined}
        />
      </div>
    </div>
  );
}
