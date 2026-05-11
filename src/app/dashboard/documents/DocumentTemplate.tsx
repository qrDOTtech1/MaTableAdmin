"use client";

import { forwardRef } from "react";

export type Vendor = {
  raisonSociale: string;
  siret: string;
  address: string;
  email: string;
  phone: string;
  representant: string;
  iban?: string;
};

export type ClientData = {
  name: string;
  address: string;
  siret: string;
  managerName: string;
  email: string;
  phone: string;
  slug: string;
};

export type DocMeta = {
  numero: string;
  date: string;
  validite: string;
  echeance: string;
  periode: string;
};

export type Prestation = {
  description: string;
  montantHT: number;
  modalites: string;
  delaiLivraison: string;
};

export type PriceInfo = {
  monthly: number;
  total: number;
  mult: string;
};

export type DocType = "contrat" | "prestation" | "devis" | "facture" | "cgvu" | "onboarding" | "tarification";

type Props = {
  docType: DocType;
  vendor: Vendor;
  clientData: ClientData;
  docMeta: DocMeta;
  engagement: string;
  prestation: Prestation;
  priceInfo: PriceInfo;
};

const DocumentTemplate = forwardRef<HTMLDivElement, Props>(function DocumentTemplate(
  { docType, vendor, clientData, docMeta, engagement, prestation, priceInfo },
  ref
) {
  return (
    <div
      ref={ref}
      className="bg-white"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        fontFamily: "Arial, sans-serif",
        color: "#1a1a1a",
      }}
    >
      {/* Header commun */}
      <div className="flex justify-between items-start border-b-2 border-black pb-5 mb-8">
        <div className="text-2xl font-black">
          Ma <span className="text-orange-500">Table</span>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div className="uppercase font-bold">{docType === "cgvu" ? "CGV / CGU" : docType}</div>
          <b className="text-black text-lg block">{docMeta.numero}</b>
          {docType === "devis" && <div>Valable jusqu'au : {docMeta.validite}</div>}
          {docType === "facture" && (
            <>
              <div>Date : {docMeta.date}</div>
              <div>Échéance : {docMeta.echeance}</div>
            </>
          )}
          {docType === "contrat" && <div>Date : {docMeta.date}</div>}
        </div>
      </div>

      <h1 className="text-xl font-black uppercase tracking-widest text-center mb-8 pb-4 border-b">
        {docType === "contrat" && "Contrat d'Abonnement — Plateforme Ma Table"}
        {docType === "prestation" && "Contrat de Prestation — Ma Table"}
        {docType === "devis" && "Devis — Abonnement Ma Table"}
        {docType === "facture" && "Facture — Abonnement Ma Table"}
        {docType === "cgvu" && "Conditions Générales de Vente et d'Utilisation"}
        {docType === "onboarding" && "Fiche d'Activation — Ma Table"}
        {docType === "tarification" && "Fiche Tarification & Suivi Client"}
      </h1>

      {/* ===== CONTRAT D'ABONNEMENT ===== */}
      {docType === "contrat" && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Le Prestataire</h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-500">Raison sociale : <span className="text-black font-bold">{vendor.raisonSociale}</span></p>
                <p className="text-gray-500">SIRET : <span className="text-black font-bold">{vendor.siret}</span></p>
                <p className="text-gray-500">Email : <span className="text-black font-bold">{vendor.email}</span></p>
                <p className="text-gray-500">Téléphone : <span className="text-black font-bold">{vendor.phone}</span></p>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Le Client</h3>
              <div className="text-sm space-y-2">
                <p className="text-orange-900">Raison sociale : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.name || "..."}</span></p>
                <p className="text-orange-900">Adresse : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.address || "..."}</span></p>
                <p className="text-orange-900">SIRET : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.siret || "..."}</span></p>
                <p className="text-orange-900">Représentant : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.managerName || "..."}</span></p>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 1 — Objet</h2>
          <p className="text-sm mb-4 leading-relaxed">Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire met à disposition du Client l'accès à la plateforme SaaS <strong>Ma Table</strong>.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 2 — Modules & Tarifs</h2>
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Module</th>
                <th className="p-3 text-right">Prix HT/mois</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3"><b>Avis Google & Réputation</b><br/><span className="text-xs text-gray-500">Conversation IA post-repas, génération d'avis</span></td>
                <td className="p-3 text-right">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              <tr className="bg-gray-50 font-black">
                <td className="p-3">TOTAL MENSUEL HT</td>
                <td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 3 — Engagement</h2>
          <p className="text-sm mb-4 leading-relaxed">Contrat conclu pour une durée minimale de <strong className="text-orange-700 bg-orange-50 px-1">{engagement.replace('m', ' mois').replace('a', ' mois')}</strong>. Renouvellement tacite mensuel ensuite. Préavis de résiliation de 30 jours.</p>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="border rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Le Prestataire</h3>
              <div className="border-b h-12 mb-2"></div>
              <p className="text-xs text-gray-500">{vendor.representant}<br/>Date : {docMeta.date}</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Le Client</h3>
              <div className="border-b border-orange-200 h-12 mb-2"></div>
              <p className="text-xs text-orange-900"><span className="font-bold bg-white px-1 rounded">{clientData.managerName || "..."}</span><br/>Date : {docMeta.date}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== FACTURE ===== */}
      {docType === "facture" && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Émetteur</h3>
              <p className="text-sm font-bold mb-1">{vendor.raisonSociale}</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                SIRET: {vendor.siret}<br/>
                Email: {vendor.email}<br/>
                Tél: {vendor.phone}<br/>
                IBAN: {vendor.iban}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Destinataire</h3>
              <p className="text-sm font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200 inline-block mb-1">{clientData.name || "..."}</p>
              <p className="text-sm text-orange-900 leading-relaxed">
                <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.address || "..."}</span><br/>
                SIRET: <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.siret || "..."}</span>
              </p>
            </div>
          </div>

          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Désignation</th>
                <th className="p-3">Période</th>
                <th className="p-3 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3"><b>Abonnement Ma Table</b><br/><span className="text-xs text-gray-500">Avis Google & Réputation</span></td>
                <td className="p-3">{docMeta.periode}</td>
                <td className="p-3 text-right">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              <tr>
                <td colSpan={2} className="p-3 text-right font-bold">TOTAL HT</td>
                <td className="p-3 text-right font-bold">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              <tr>
                <td colSpan={2} className="p-3 text-right text-xs text-gray-500">TVA non applicable — Art. 293B du CGI</td>
                <td className="p-3 text-right font-bold">—</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-black text-white rounded-xl p-6 flex justify-between items-end mt-4">
            <div>
              <div className="font-bold">Net à payer</div>
              <div className="text-xs text-gray-400">Virement bancaire (échéance le {docMeta.echeance})</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-orange-500">{priceInfo.monthly.toFixed(2)} €</div>
              <div className="text-xs text-gray-400">TTC · Sans TVA</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DEVIS ===== */}
      {docType === "devis" && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Émetteur</h3>
              <p className="text-sm font-bold mb-1">{vendor.raisonSociale}</p>
              <p className="text-xs text-gray-500">{vendor.email}<br/>{vendor.phone}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Client</h3>
              <p className="text-sm font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200 inline-block">{clientData.name || "..."}</p>
            </div>
          </div>
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Description</th>
                <th className="p-3">Engagement</th>
                <th className="p-3 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3"><b>Abonnement Ma Table</b></td>
                <td className="p-3 text-orange-700">{engagement}</td>
                <td className="p-3 text-right">{priceInfo.monthly.toFixed(2)} € / mois</td>
              </tr>
              {engagement !== "12m" && (
                <tr className="border-b text-xs text-gray-500">
                  <td colSpan={2} className="p-3 text-right">Majoration / Remise engagement</td>
                  <td className="p-3 text-right">{priceInfo.mult}</td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="p-3 text-right font-bold">Mensualité HT</td>
                <td className="p-3 text-right font-bold">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="border rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Bon pour accord - Client</h3>
              <div className="border-b h-12 mb-2"></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ONBOARDING ===== */}
      {docType === "onboarding" && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Informations établissement</h2>
          <table className="w-full text-sm mb-8">
            <tbody>
              <tr className="border-b"><td className="p-3 font-bold w-1/3">Nom</td><td className="p-3"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.name || "..."}</span></td></tr>
              <tr className="border-b"><td className="p-3 font-bold w-1/3">URL</td><td className="p-3">matable.pro/<span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.slug || "..."}</span></td></tr>
              <tr className="border-b"><td className="p-3 font-bold w-1/3">Gérant</td><td className="p-3"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.managerName || "..."}</span></td></tr>
              <tr className="border-b"><td className="p-3 font-bold w-1/3">Email</td><td className="p-3"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.email || "..."}</span></td></tr>
              <tr className="border-b"><td className="p-3 font-bold w-1/3">Téléphone</td><td className="p-3"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.phone || "..."}</span></td></tr>
            </tbody>
          </table>
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Checklist</h2>
          <ul className="space-y-3 text-sm ml-4">
            <li>[ ] Contrat signé</li>
            <li>[ ] Compte créé</li>
            <li>[ ] QR imprimé</li>
            <li>[ ] Lien Google ajouté</li>
          </ul>
        </div>
      )}

      {/* ===== CONTRAT DE PRESTATION ===== */}
      {docType === "prestation" && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Le Prestataire</h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-500">Raison sociale : <span className="text-black font-bold">{vendor.raisonSociale}</span></p>
                <p className="text-gray-500">Représentant : <span className="text-black font-bold">{vendor.representant}</span></p>
                <p className="text-gray-500">SIRET : <span className="text-black font-bold">{vendor.siret}</span></p>
                <p className="text-gray-500">Adresse : <span className="text-black font-bold">{vendor.address}</span></p>
                <p className="text-gray-500">Email : <span className="text-black font-bold">{vendor.email}</span></p>
                <p className="text-gray-500">Téléphone : <span className="text-black font-bold">{vendor.phone}</span></p>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Le Bénéficiaire</h3>
              <div className="text-sm space-y-2">
                <p className="text-orange-900">Établissement : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.name || "..."}</span></p>
                <p className="text-orange-900">Chef / gérant : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.managerName || "..."}</span></p>
                <p className="text-orange-900">Adresse : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.address || "..."}</span></p>
                <p className="text-orange-900">SIRET : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.siret || "..."}</span></p>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 1 — Objet de la prestation</h2>
          <p className="text-sm mb-4 leading-relaxed whitespace-pre-line">{prestation.description}</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 2 — Délai de livraison</h2>
          <p className="text-sm mb-4 leading-relaxed">{prestation.delaiLivraison}</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 3 — Rémunération</h2>
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Désignation</th>
                <th className="p-3 text-right">Montant HT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3"><b>Prestation forfaitaire</b></td>
                <td className="p-3 text-right">{prestation.montantHT.toFixed(2)} €</td>
              </tr>
              <tr className="bg-gray-50 font-black">
                <td className="p-3">TOTAL HT</td>
                <td className="p-3 text-right text-orange-500">{prestation.montantHT.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-4">Modalités : {prestation.modalites}</p>
          <p className="text-xs text-gray-500 italic mb-4">TVA non applicable, art. 293B du CGI.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 4 — Propriété intellectuelle</h2>
          <p className="text-sm mb-4 leading-relaxed">Les livrables réalisés dans le cadre de la présente prestation deviennent la propriété du Bénéficiaire à compter du paiement intégral du prix convenu.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Article 5 — Résiliation</h2>
          <p className="text-sm mb-4 leading-relaxed">En cas de manquement grave de l'une des parties à ses obligations, le contrat pourra être résilié de plein droit, après mise en demeure restée sans effet sous 15 jours.</p>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="border rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Le Prestataire</h3>
              <div className="border-b h-12 mb-2"></div>
              <p className="text-xs text-gray-500">{vendor.representant}<br/>Date : {docMeta.date}</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Le Bénéficiaire</h3>
              <div className="border-b border-orange-200 h-12 mb-2"></div>
              <p className="text-xs text-orange-900"><span className="font-bold bg-white px-1 rounded">{clientData.managerName || "..."}</span><br/>Date : {docMeta.date}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== FICHE TARIFICATION & SUIVI ===== */}
      {docType === "tarification" && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Client</h3>
              <div className="text-sm space-y-1">
                <p className="font-bold text-base">{clientData.name || "..."}</p>
                <p className="text-gray-500">Gérant : <span className="text-black">{clientData.managerName || "..."}</span></p>
                <p className="text-gray-500">SIRET : <span className="text-black">{clientData.siret || "..."}</span></p>
                <p className="text-gray-500">Email : <span className="text-black">{clientData.email || "..."}</span></p>
                <p className="text-gray-500">Téléphone : <span className="text-black">{clientData.phone || "..."}</span></p>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Tarification active</h3>
              <div className="text-sm space-y-1">
                <p className="text-orange-900">Engagement : <b>{engagement}</b></p>
                <p className="text-orange-900">Mensualité HT : <b>{priceInfo.monthly.toFixed(2)} €</b></p>
                <p className="text-orange-900">Total période : <b>{priceInfo.total.toFixed(2)} €</b></p>
                <p className="text-orange-900 text-xs italic">Maj. engagement : {priceInfo.mult}</p>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Modules souscrits</h2>
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Module</th>
                <th className="p-3 text-center">Actif</th>
                <th className="p-3 text-right">Prix HT/mois</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-3">Avis Google & Réputation</td><td className="p-3 text-center">✓</td><td className="p-3 text-right">{priceInfo.monthly.toFixed(2)} €</td></tr>
              <tr className="border-b text-gray-400"><td className="p-3">QR Codes Table</td><td className="p-3 text-center">—</td><td className="p-3 text-right">—</td></tr>
              <tr className="border-b text-gray-400"><td className="p-3">Portail Serveur</td><td className="p-3 text-center">—</td><td className="p-3 text-right">—</td></tr>
              <tr className="border-b text-gray-400"><td className="p-3">Gestion Stock IA</td><td className="p-3 text-center">—</td><td className="p-3 text-right">—</td></tr>
              <tr className="border-b text-gray-400"><td className="p-3">Réservations</td><td className="p-3 text-center">—</td><td className="p-3 text-right">—</td></tr>
              <tr className="bg-gray-50 font-black"><td className="p-3">TOTAL HT/mois</td><td className="p-3"></td><td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td></tr>
            </tbody>
          </table>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Suivi des paiements</h2>
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-xs uppercase tracking-wider">
                <th className="p-2">Période</th>
                <th className="p-2">N° Facture</th>
                <th className="p-2 text-right">Montant</th>
                <th className="p-2 text-center">Statut</th>
                <th className="p-2">Date règlement</th>
              </tr>
            </thead>
            <tbody>
              {[0,1,2,3,4,5].map((i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 text-gray-400">…/…/…</td>
                  <td className="p-2 text-gray-400">—</td>
                  <td className="p-2 text-right text-gray-400">—</td>
                  <td className="p-2 text-center text-gray-400">○</td>
                  <td className="p-2 text-gray-400">—</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Notes & événements</h2>
          <div className="border rounded-lg p-3 min-h-[100px] text-xs text-gray-500 italic">
            (à compléter — date de signature, mises à jour de tarif, suspensions, etc.)
          </div>

          <div className="mt-8 pt-4 border-t text-xs text-gray-500">
            <p>Fiche établie le {docMeta.date} par {vendor.representant} — {vendor.raisonSociale}</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default DocumentTemplate;

// Helper : reconstruit priceInfo selon l'engagement (logique partagée)
export function computePriceInfo(engagement: string): PriceInfo {
  switch (engagement) {
    case "3m": return { monthly: 84.53, total: 253.59, mult: "+7%" };
    case "6m": return { monthly: 82.95, total: 497.70, mult: "+5%" };
    case "9m": return { monthly: 81.37, total: 732.33, mult: "+3%" };
    case "12a": return { monthly: 75.05, total: 900.60, mult: "-5%" };
    case "12m":
    default: return { monthly: 79.00, total: 948.00, mult: "0%" };
  }
}
