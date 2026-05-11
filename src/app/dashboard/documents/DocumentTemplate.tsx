"use client";

import { forwardRef } from "react";

export type Vendor = {
  raisonSociale: string;
  formeJuridique?: string;   // ex. "Auto-entrepreneur", "SARL au capital de 5 000 €"
  siret: string;             // placeholder "[N° SIRET en cours d'immatriculation]" si vide
  rcs?: string;              // ex. "RCS Paris 123 456 789" — facultatif si AE
  codeAPE?: string;          // ex. "6201Z — Programmation informatique"
  tvaIntracom?: string;      // ex. "FR XX 123456789" ou "Non assujetti (art. 293B du CGI)"
  address: string;
  email: string;
  phone: string;
  representant: string;      // nom du signataire physique
  iban?: string;
  bic?: string;
};

// Renvoie la valeur ou un placeholder lisible si vide — utilisé partout dans les templates
const PH = (v: string | undefined, label: string) =>
  (v && v.trim().length > 0) ? v : `[${label} — à compléter]`;

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
                <p className="text-gray-500">Forme juridique : <span className="text-black font-bold">{PH(vendor.formeJuridique, "Forme juridique")}</span></p>
                <p className="text-gray-500">SIRET : <span className="text-black font-bold">{PH(vendor.siret, "N° SIRET — IMAT en cours")}</span></p>
                {vendor.rcs && <p className="text-gray-500">RCS : <span className="text-black font-bold">{vendor.rcs}</span></p>}
                <p className="text-gray-500">Adresse : <span className="text-black font-bold">{vendor.address}</span></p>
                <p className="text-gray-500">Email : <span className="text-black font-bold">{vendor.email}</span></p>
                <p className="text-gray-500">Téléphone : <span className="text-black font-bold">{vendor.phone}</span></p>
                <p className="text-gray-500">Représenté par : <span className="text-black font-bold">{vendor.representant}</span></p>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Le Client</h3>
              <div className="text-sm space-y-2">
                <p className="text-orange-900">Raison sociale : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.name || "..."}</span></p>
                <p className="text-orange-900">Adresse : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.address || "..."}</span></p>
                <p className="text-orange-900">SIRET : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.siret || "..."}</span></p>
                <p className="text-orange-900">Représentant : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.managerName || "..."}</span></p>
                <p className="text-orange-900">Email : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.email || "..."}</span></p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-6 italic">Ci-après désignés ensemble « les Parties ». Il a été convenu ce qui suit :</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 1 — Objet du contrat</h2>
          <p className="text-sm mb-3 leading-relaxed">Le présent contrat (« <b>le Contrat</b> ») a pour objet de définir les conditions dans lesquelles le Prestataire met à disposition du Client, sous forme de service en ligne (SaaS), l'accès à la plateforme <b>Ma Table</b> ainsi qu'aux modules choisis. Le Prestataire conserve la pleine propriété de la plateforme, de son code et de ses contenus.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 2 — Modules & Tarifs</h2>
          <table className="w-full text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Module</th>
                <th className="p-3 text-right">Prix HT/mois</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-3"><b>Avis Google & Réputation</b><br/><span className="text-xs text-gray-500">Conversation IA post-repas, génération d'avis Google authentiques</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="border-b"><td className="p-3"><b>QR Codes & Commande à table</b><br/><span className="text-xs text-gray-500">Génération QR par table, commande directe par les clients</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="border-b"><td className="p-3"><b>Portail Serveur</b><br/><span className="text-xs text-gray-500">Prise de commande mobile, suivi des tables, attribution serveur</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="border-b"><td className="p-3"><b>Cuisine Live</b><br/><span className="text-xs text-gray-500">Écran cuisine temps réel, statuts plats, ruptures</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="border-b"><td className="p-3"><b>Caisse intégrée</b><br/><span className="text-xs text-gray-500">Encaissement par session, modes de paiement, pourboires</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="border-b"><td className="p-3"><b>Nova IA — Assistant complet</b> <span className="text-xs text-gray-500">(par NovaTech)</span><br/><span className="text-xs text-gray-500">Magic Scan menu, descriptions, planning, chatbot, finance IA — usage standard inclus (voir art. 5 bis)</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="border-b"><td className="p-3"><b>Gestion de stock IA</b><br/><span className="text-xs text-gray-500">Suivi des ingrédients, alertes seuils, prédictions</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="border-b"><td className="p-3"><b>Réservations en ligne</b><br/><span className="text-xs text-gray-500">Calendrier, acompte Stripe, politique d'annulation</span></td><td className="p-3 text-right">Inclus</td></tr>
              <tr className="bg-gray-50 font-black"><td className="p-3">TOTAL MENSUEL HT</td><td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-4">TVA non applicable, art. 293B du CGI. Hébergement, mises à jour et support inclus.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 3 — Durée & Engagement</h2>
          <p className="text-sm mb-3 leading-relaxed">Le Contrat est conclu pour une durée ferme minimale de <b className="text-orange-700 bg-orange-50 px-1">{engagement.replace('m', ' mois').replace('a', ' mois (paiement annuel)')}</b> à compter de sa date de signature, période durant laquelle aucune résiliation anticipée n'est possible sauf cas prévus à l'article 9. À l'issue de cette période, le Contrat se renouvelle <b>tacitement par périodes successives d'un mois</b>, sauf résiliation notifiée par l'une des Parties au moins 30 jours avant l'échéance, par email avec accusé de réception.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 4 — Modalités de paiement</h2>
          <p className="text-sm mb-2 leading-relaxed">Le Client règle le Prestataire par <b>virement bancaire</b> ou <b>prélèvement SEPA</b>, à terme à échoir, le 1er de chaque mois. Toute mise en service est conditionnée à la réception du premier paiement.</p>
          <p className="text-sm mb-3 leading-relaxed">En cas de retard de paiement et conformément à l'art. <b>L. 441-10 du Code de commerce</b>, des pénalités égales à <b>3 fois le taux d'intérêt légal</b> seront appliquées de plein droit, sans mise en demeure préalable. Une indemnité forfaitaire pour frais de recouvrement de <b>40 € (art. D. 441-5)</b> sera également due. Aucun escompte n'est accordé pour paiement anticipé.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 4 bis — Limite raisonnable d'utilisation de l'IA</h2>
          <p className="text-sm mb-2 leading-relaxed">Les fonctionnalités d'intelligence artificielle de la Plateforme (Nova IA, Magic Scan, descriptions, chatbot, finance assistée) sont opérées par notre partenaire technique <b>NovaTech</b> et fournies dans la limite d'un <b>usage professionnel raisonnable</b>.</p>
          <p className="text-sm mb-2 leading-relaxed">Au-delà du seuil standard (correspondant approximativement à 2 fois l'usage moyen constaté sur des clients de profil comparable) :</p>
          <ul className="text-sm mb-3 ml-6 list-disc space-y-1">
            <li>une notification email est envoyée au Client à 80 % du quota mensuel ;</li>
            <li>les services IA pourront être <b>temporairement restreints</b> jusqu'au début du mois suivant ;</li>
            <li>un <b>quota étendu</b> peut être souscrit à tout moment sur devis préalable, sans interruption de service ;</li>
            <li>les autres modules (commande, caisse, serveur, cuisine, stock hors IA, réservations) <b>demeurent pleinement opérationnels</b> en cas de restriction des fonctions IA.</li>
          </ul>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 5 — Disponibilité du service</h2>
          <p className="text-sm mb-3 leading-relaxed">Le Prestataire s'engage à fournir un service disponible <b>24h/24 et 7j/7</b>, avec un taux d'engagement de disponibilité (SLA) cible de <b>99 %</b> sur l'année, hors interventions de maintenance planifiées (notifiées 48 h à l'avance) et cas de force majeure (art. 10). Le support est assuré par email (<b>{vendor.email}</b>) du lundi au vendredi, 9h–18h.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 6 — Données personnelles & RGPD</h2>
          <p className="text-sm mb-2 leading-relaxed">Le Prestataire agit en tant que <b>sous-traitant</b> au sens de l'art. 28 du RGPD pour les données personnelles que le Client lui confie (clients finaux, avis, commandes). Le Prestataire s'engage à :</p>
          <ul className="text-sm mb-3 ml-6 list-disc space-y-1">
            <li>traiter les données uniquement aux fins de l'exécution du Contrat ;</li>
            <li>garantir la confidentialité et la sécurité (chiffrement TLS, hébergement UE) ;</li>
            <li>notifier toute violation de données dans les 72 heures ;</li>
            <li>restituer ou détruire les données à la fin du Contrat sur demande écrite du Client.</li>
          </ul>
          <p className="text-sm mb-2 leading-relaxed"><b>Sous-traitants ultérieurs autorisés</b> : Railway Corp. (hébergement UE), <b>NovaTech</b> (modèles IA pour les fonctions Nova IA — données limitées au strict nécessaire, non utilisées pour l'entraînement), Stripe (paiements, si module Réservations actif), Resend (emails transactionnels).</p>
          <p className="text-sm mb-3 leading-relaxed">Le Client conserve la pleine propriété des données qu'il saisit ou que ses clients génèrent via la plateforme.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 7 — Propriété intellectuelle</h2>
          <p className="text-sm mb-3 leading-relaxed">La plateforme Ma Table, sa marque, son code, ses interfaces et l'ensemble des contenus qu'elle contient (hors données client) sont la propriété exclusive du Prestataire. Le Contrat confère au Client un <b>droit d'usage personnel, non-exclusif et non-transférable</b> pendant la durée du Contrat. Toute reproduction, décompilation ou diffusion est strictement interdite.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 8 — Confidentialité</h2>
          <p className="text-sm mb-3 leading-relaxed">Chacune des Parties s'engage à conserver confidentielles toutes informations dont elle aurait connaissance dans le cadre du Contrat, et à ne les divulguer à aucun tiers sans l'accord écrit de l'autre Partie. Cette obligation perdure 3 ans après la fin du Contrat.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 9 — Résiliation</h2>
          <p className="text-sm mb-3 leading-relaxed">En cas de manquement grave de l'une des Parties à ses obligations, l'autre Partie pourra résilier le Contrat de plein droit, 30 jours après mise en demeure restée infructueuse, sans préjudice de dommages et intérêts. Une <b>résiliation anticipée à l'initiative du Client</b> avant la fin de la période d'engagement entraîne le paiement intégral des mensualités restant dues, sans qu'il soit besoin de mise en demeure.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 10 — Force majeure</h2>
          <p className="text-sm mb-3 leading-relaxed">Aucune des Parties ne pourra être tenue responsable d'un manquement résultant d'un cas de force majeure au sens de l'art. 1218 du Code civil. La Partie empêchée informera l'autre dans les meilleurs délais ; les obligations seront suspendues le temps de l'événement.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 11 — Loi applicable & juridiction</h2>
          <p className="text-sm mb-6 leading-relaxed">Le Contrat est soumis au droit français. Tout différend non résolu à l'amiable dans un délai de 30 jours sera porté devant les tribunaux compétents du ressort du siège social du Prestataire.</p>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="border rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Le Prestataire</h3>
              <p className="text-xs text-gray-500 mb-2">Précédé de la mention manuscrite « lu et approuvé »</p>
              <div className="border-b h-14 mb-2"></div>
              <p className="text-xs text-gray-500">{vendor.representant} — Date : {docMeta.date}</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Le Client</h3>
              <p className="text-xs text-orange-700 mb-2">Précédé de la mention manuscrite « lu et approuvé »</p>
              <div className="border-b border-orange-200 h-14 mb-2"></div>
              <p className="text-xs text-orange-900"><span className="font-bold bg-white px-1 rounded">{clientData.managerName || "..."}</span> — Date : {docMeta.date}</p>
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
                {vendor.formeJuridique && <>{vendor.formeJuridique}<br/></>}
                {vendor.address}<br/>
                SIRET : {PH(vendor.siret, "N° SIRET — IMAT en cours")}<br/>
                {vendor.rcs && <>RCS : {vendor.rcs}<br/></>}
                {vendor.codeAPE && <>Code APE : {vendor.codeAPE}<br/></>}
                TVA intracom. : {vendor.tvaIntracom || "Non assujetti (art. 293B CGI)"}<br/>
                Email : {vendor.email}<br/>
                Tél : {vendor.phone}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Destinataire</h3>
              <p className="text-sm font-bold mb-1">{clientData.name || "..."}</p>
              <p className="text-sm text-orange-900 leading-relaxed">
                {clientData.address || "..."}<br/>
                SIRET : {clientData.siret || "..."}<br/>
                Contact : {clientData.managerName || "..."}<br/>
                Email : {clientData.email || "..."}
              </p>
            </div>
          </div>

          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Désignation</th>
                <th className="p-3">Période</th>
                <th className="p-3 text-center">Qté</th>
                <th className="p-3 text-right">Prix HT</th>
                <th className="p-3 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3">
                  <b>Abonnement Ma Table — Plan complet</b><br/>
                  <span className="text-xs text-gray-500">Avis, QR, Serveur, Cuisine, Caisse, Nova IA, Stock, Réservations</span>
                </td>
                <td className="p-3">{docMeta.periode}</td>
                <td className="p-3 text-center">1</td>
                <td className="p-3 text-right">{priceInfo.monthly.toFixed(2)} €</td>
                <td className="p-3 text-right">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              <tr className="border-b">
                <td colSpan={4} className="p-3 text-right font-bold">Total HT</td>
                <td className="p-3 text-right font-bold">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              <tr className="border-b">
                <td colSpan={4} className="p-3 text-right text-xs text-gray-600">TVA non applicable — art. 293B du CGI</td>
                <td className="p-3 text-right text-xs text-gray-600">— €</td>
              </tr>
              <tr className="bg-gray-50 font-black">
                <td colSpan={4} className="p-3 text-right">Total TTC</td>
                <td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-black text-white rounded-xl p-6 flex justify-between items-end mb-6">
            <div>
              <div className="font-bold text-lg">Net à payer</div>
              <div className="text-xs text-gray-400">Échéance : <b className="text-white">{docMeta.echeance}</b></div>
              <div className="text-xs text-gray-400 mt-1">Mode : virement bancaire</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-orange-500">{priceInfo.monthly.toFixed(2)} €</div>
              <div className="text-xs text-gray-400">Sans TVA</div>
            </div>
          </div>

          <div className="bg-gray-50 border rounded-xl p-4 mb-4">
            <h3 className="text-xs uppercase tracking-widest text-gray-600 font-black mb-2">Coordonnées bancaires</h3>
            <p className="text-sm font-mono">
              IBAN : <b>{PH(vendor.iban, "IBAN à compléter")}</b><br/>
              BIC : <b>{PH(vendor.bic, "BIC à compléter")}</b><br/>
              Titulaire : <b>{vendor.raisonSociale}</b><br/>
              Référence à indiquer : <b>{docMeta.numero}</b>
            </p>
          </div>

          <div className="text-xs text-gray-500 leading-relaxed space-y-1 border-t pt-3">
            <p><b>Conditions de règlement :</b> Paiement à 15 jours date de facture, sans escompte pour règlement anticipé.</p>
            <p><b>Pénalités de retard (art. L. 441-10 du Code de commerce) :</b> En cas de retard de paiement, des pénalités égales à 3 fois le taux d'intérêt légal seront appliquées de plein droit, sans mise en demeure préalable.</p>
            <p><b>Indemnité forfaitaire pour frais de recouvrement :</b> 40 € (art. D. 441-5 du Code de commerce).</p>
            <p>Pour toute question relative à cette facture : <b>{vendor.email}</b>.</p>
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
              <p className="text-xs text-gray-500 leading-relaxed">
                {vendor.address}<br/>
                SIRET : {PH(vendor.siret, "IMAT en cours")}<br/>
                {vendor.email} · {vendor.phone}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">À l'attention de</h3>
              <p className="text-sm font-bold mb-1">{clientData.name || "..."}</p>
              <p className="text-xs text-orange-900 leading-relaxed">
                {clientData.address || "..."}<br/>
                {clientData.managerName && <>Contact : {clientData.managerName}<br/></>}
                {clientData.email && <>{clientData.email}</>}
              </p>
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Objet</h2>
          <p className="text-sm mb-4 leading-relaxed">Mise à disposition de la plateforme SaaS <b>Ma Table</b> — plan complet incluant l'ensemble des modules : Avis Google, QR Commande, Portail Serveur, Cuisine Live, Caisse, Nova IA, Stock, Réservations. Hébergement, mises à jour et support inclus.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Détail tarifaire</h2>
          <table className="w-full text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Description</th>
                <th className="p-3">Engagement</th>
                <th className="p-3 text-right">Prix HT/mois</th>
                <th className="p-3 text-right">Total HT période</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3"><b>Abonnement Ma Table — Plan complet</b><br/><span className="text-xs text-gray-500">Tous modules inclus</span></td>
                <td className="p-3 text-orange-700 font-bold">{engagement.replace("m", " mois").replace("12a", "12 mois (annuel)")}</td>
                <td className="p-3 text-right">{priceInfo.monthly.toFixed(2)} €</td>
                <td className="p-3 text-right">{priceInfo.total.toFixed(2)} €</td>
              </tr>
              {engagement !== "12m" && (
                <tr className="border-b text-xs text-gray-500 italic">
                  <td colSpan={3} className="p-3 text-right">Effet engagement par rapport au tarif de référence 12 mois</td>
                  <td className="p-3 text-right">{priceInfo.mult}</td>
                </tr>
              )}
              <tr className="bg-gray-50 font-black">
                <td colSpan={2} className="p-3 text-right">Mensualité HT</td>
                <td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td>
                <td className="p-3 text-right text-orange-500">{priceInfo.total.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-4">TVA non applicable, art. 293B du CGI.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Conditions</h2>
          <ul className="text-sm mb-4 ml-6 list-disc space-y-1">
            <li>Devis valable jusqu'au <b>{docMeta.validite}</b>.</li>
            <li>Tarifs exprimés en euros, hors taxes (TVA non applicable).</li>
            <li>Paiement par virement bancaire ou prélèvement SEPA mensuel à terme à échoir.</li>
            <li>Mise en service immédiate dès retour du contrat signé et du premier paiement.</li>
            <li>Engagement ferme sur la période choisie ; renouvellement tacite mensuel à l'issue.</li>
            <li>Préavis de résiliation : 30 jours par email avec accusé de réception.</li>
            <li>Conditions complètes : voir contrat d'abonnement et CGV/CGU joints.</li>
          </ul>

          <div className="grid grid-cols-2 gap-8 mt-10">
            <div className="border rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Émetteur</h3>
              <div className="border-b h-14 mb-2"></div>
              <p className="text-xs text-gray-500">{vendor.representant} — {docMeta.date}</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Bon pour accord — Client</h3>
              <p className="text-xs text-orange-700 mb-2">Mention manuscrite « bon pour accord » + signature + date</p>
              <div className="border-b border-orange-200 h-14 mb-2"></div>
              <p className="text-xs text-orange-900">{clientData.managerName || "..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== CGV / CGU ===== */}
      {docType === "cgvu" && (
        <div className="text-sm leading-relaxed">
          <p className="text-xs text-gray-500 mb-6 italic">En vigueur au {docMeta.date}. Applicables à toute souscription d'un abonnement à la plateforme Ma Table.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 1 — Identification du Prestataire</h2>
          <p className="mb-3">La plateforme Ma Table (« <b>la Plateforme</b> ») est éditée et exploitée par :</p>
          <ul className="ml-6 mb-3 list-disc">
            <li><b>{vendor.raisonSociale}</b> {vendor.formeJuridique && <>— {vendor.formeJuridique}</>}</li>
            <li>Siège social : {vendor.address}</li>
            <li>SIRET : {PH(vendor.siret, "N° SIRET — IMAT en cours")}</li>
            {vendor.rcs && <li>RCS : {vendor.rcs}</li>}
            {vendor.codeAPE && <li>Code APE : {vendor.codeAPE}</li>}
            <li>TVA intracom. : {vendor.tvaIntracom || "Non assujetti (art. 293B du CGI)"}</li>
            <li>Email : {vendor.email} · Téléphone : {vendor.phone}</li>
            <li>Directeur de la publication : {vendor.representant}</li>
            <li>Hébergeur : Railway Corp., 251 Little Falls Drive, Wilmington, DE 19808, États-Unis — infrastructure et base de données déployées sur la région européenne (Frankfurt, Allemagne)</li>
            <li>Code source versionné sur GitHub Inc. (Microsoft Corp.) — accès restreint</li>
            <li><b>Partenaire technique IA</b> : <b>NovaTech</b> — fournisseur des modèles d'intelligence artificielle, de leur infrastructure d'exécution et du savoir-faire associé pour les fonctionnalités Nova IA, Magic Scan, descriptions assistées, chatbot et finance IA</li>
          </ul>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 2 — Objet</h2>
          <p className="mb-3">Les présentes CGV/CGU régissent l'accès et l'utilisation de la Plateforme Ma Table, service en ligne (SaaS) à destination des établissements de restauration et assimilés (restaurants, bars, salons de thé, boutiques alimentaires). La Plateforme propose notamment : gestion d'avis Google, QR codes de commande à table, portail serveur, écran cuisine, caisse, assistant IA (Nova), gestion de stock, réservations en ligne.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 3 — Acceptation</h2>
          <p className="mb-3">Toute souscription à un abonnement implique l'acceptation pleine et entière des présentes CGV/CGU. Le Client reconnaît avoir la capacité juridique de contracter, agir en tant que professionnel et avoir pris connaissance des présentes avant signature du contrat d'abonnement.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 4 — Description des services</h2>
          <p className="mb-2">L'abonnement Ma Table comprend l'accès illimité à l'ensemble des modules suivants pour un établissement :</p>
          <ul className="ml-6 mb-3 list-disc text-xs">
            <li><b>Avis Google & Réputation</b> — collecte d'avis post-repas via IA conversationnelle, publication assistée sur Google Business Profile.</li>
            <li><b>QR Codes & Commande à table</b> — génération illimitée de QR codes par table, prise de commande client autonome.</li>
            <li><b>Portail Serveur</b> — application mobile pour le personnel de salle, suivi des sessions et commandes, attribution des tables.</li>
            <li><b>Cuisine Live</b> — écran temps réel pour la cuisine, statuts plats (en cours / servi / rupture).</li>
            <li><b>Caisse</b> — fermeture de session, modes de paiement (carte, espèces, comptoir), gestion des pourboires.</li>
            <li><b>Nova IA</b> (technologie fournie par NovaTech) — Magic Scan menu (vision), génération de descriptions, planning serveurs, chatbot client, finance assistée. <i>Soumis à une limite raisonnable d'utilisation — voir art. 8 bis.</i></li>
            <li><b>Gestion de stock IA</b> — suivi des ingrédients, alertes de seuil, prédictions.</li>
            <li><b>Réservations</b> — moteur de réservation en ligne, acompte Stripe, politique d'annulation paramétrable.</li>
          </ul>
          <p className="mb-3 text-xs italic text-gray-600">Le Prestataire se réserve le droit de faire évoluer la composition des modules et leurs fonctionnalités, sans que cela puisse être considéré comme une modification substantielle du contrat.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 5 — Tarifs & engagement</h2>
          <p className="mb-2">Tarifs en vigueur, hors taxes (TVA non applicable, art. 293B du CGI) :</p>
          <table className="w-full text-xs mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Engagement</th>
                <th className="p-2 text-right">Mensualité HT</th>
                <th className="p-2 text-right">Total période HT</th>
                <th className="p-2 text-right">Variation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2">3 mois</td><td className="p-2 text-right">84,53 €</td><td className="p-2 text-right">253,59 €</td><td className="p-2 text-right">+7 %</td></tr>
              <tr className="border-b"><td className="p-2">6 mois</td><td className="p-2 text-right">82,95 €</td><td className="p-2 text-right">497,70 €</td><td className="p-2 text-right">+5 %</td></tr>
              <tr className="border-b"><td className="p-2">9 mois</td><td className="p-2 text-right">81,37 €</td><td className="p-2 text-right">732,33 €</td><td className="p-2 text-right">+3 %</td></tr>
              <tr className="border-b bg-orange-50"><td className="p-2"><b>12 mois (référence)</b></td><td className="p-2 text-right"><b>79,00 €</b></td><td className="p-2 text-right"><b>948,00 €</b></td><td className="p-2 text-right">0 %</td></tr>
              <tr className="border-b"><td className="p-2">12 mois — paiement annuel</td><td className="p-2 text-right">75,05 €</td><td className="p-2 text-right">900,60 €</td><td className="p-2 text-right text-emerald-700">−5 %</td></tr>
            </tbody>
          </table>
          <p className="mb-3">L'engagement choisi est ferme. À son terme, le Contrat se renouvelle <b>tacitement par périodes successives d'un mois</b> au tarif de référence 12 mois, sauf résiliation notifiée 30 jours avant l'échéance par email avec accusé de réception.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 6 — Modalités de paiement</h2>
          <p className="mb-2">Paiement par <b>virement bancaire</b> ou <b>prélèvement SEPA</b>, à terme à échoir, le 1er de chaque mois (ou à la signature pour le paiement annuel). La mise en service est conditionnée à la réception du premier règlement.</p>
          <p className="mb-3">En cas de retard de paiement et conformément à l'art. <b>L. 441-10 du Code de commerce</b>, les pénalités s'élèvent à <b>3 fois le taux d'intérêt légal</b>, exigibles de plein droit sans mise en demeure préalable. Une indemnité forfaitaire de <b>40 € (art. D. 441-5)</b> est également due. Aucun escompte n'est accordé pour paiement anticipé.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 7 — Durée & résiliation</h2>
          <p className="mb-2">L'abonnement est conclu pour la durée d'engagement choisie. Toute résiliation anticipée par le Client avant la fin de la période d'engagement entraîne le paiement intégral des mensualités restant dues.</p>
          <p className="mb-3">Chaque Partie peut résilier le Contrat à effet immédiat, sans indemnité, en cas de manquement grave de l'autre Partie demeuré non corrigé 30 jours après mise en demeure restée infructueuse (notamment : défaut de paiement, atteinte à la sécurité, usage non conforme).</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 8 — Disponibilité & support</h2>
          <p className="mb-3">Le Prestataire s'engage sur un <b>taux de disponibilité cible de 99 %</b> calculé sur l'année, hors maintenance planifiée (notifiée 48 h à l'avance) et cas de force majeure. Le support est accessible par email à <b>{vendor.email}</b> du lundi au vendredi, 9h–18h (heure de Paris). Délai de réponse cible : 24 h ouvrées.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 8 bis — Limite raisonnable d'utilisation de l'IA (Fair Use)</h2>
          <p className="mb-2">Les fonctionnalités d'intelligence artificielle de la Plateforme (Nova IA, Magic Scan, génération de descriptions, chatbot, finance assistée) sont fournies dans la limite d'un <b>usage professionnel raisonnable</b>, défini comme l'usage moyen constaté chez les clients de profil et de volume d'activité comparables.</p>
          <p className="mb-2">Les modèles d'IA et leur infrastructure sont opérés par notre partenaire technique <b>NovaTech</b>. Leur utilisation excessive génère des coûts d'infrastructure supplémentaires. En conséquence :</p>
          <ul className="ml-6 mb-2 list-disc">
            <li>Le Client est informé lorsqu'il approche du seuil de l'usage standard (notification email à 80 % du quota mensuel).</li>
            <li>Au dépassement du seuil (correspondant approximativement à <b>2 fois l'usage standard</b>), les services IA pourront être <b>temporairement restreints</b> jusqu'au début du mois suivant ou jusqu'à activation d'un quota étendu.</li>
            <li>Un <b>quota étendu</b> (volume IA supplémentaire) peut être souscrit à tout moment sur devis préalable. Le tarif dépend du volume demandé et est communiqué par email avant facturation.</li>
            <li>Les autres modules (QR Commande, Caisse, Serveur, Cuisine, Stock hors prédictions IA, Réservations) restent <b>pleinement opérationnels</b> en cas de restriction des fonctions IA.</li>
          </ul>
          <p className="mb-3">Le Prestataire s'engage à faire ses meilleurs efforts pour informer le Client en amont et lui proposer des solutions (extension de quota, optimisation d'usage) avant toute restriction effective.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 9 — Obligations du Client</h2>
          <ul className="ml-6 mb-3 list-disc">
            <li>Fournir des informations exactes et tenues à jour (nom commercial, adresse, SIRET, contact).</li>
            <li>Conserver la confidentialité de ses identifiants et codes PIN serveur / caisse / cuisine.</li>
            <li>Ne pas utiliser la Plateforme à des fins illégales ou contraires aux bonnes mœurs.</li>
            <li>S'assurer de la conformité de ses propres contenus (menu, photos, descriptions) au droit applicable.</li>
            <li>Respecter le RGPD vis-à-vis de ses propres clients (information, droit d'accès).</li>
          </ul>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 10 — Propriété intellectuelle</h2>
          <p className="mb-3">L'ensemble des éléments composant la Plateforme (code, design, marque « Ma Table », interfaces, contenus éditoriaux, IA, base de données) est la propriété exclusive du Prestataire et protégé par le droit d'auteur et le droit des marques. Le Client bénéficie d'un droit d'usage personnel, non-exclusif et non-transférable pendant la durée du Contrat. Les <b>données saisies par le Client</b> (menu, clients finaux, commandes, avis) demeurent sa propriété exclusive.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 11 — Données personnelles (RGPD)</h2>
          <p className="mb-2">Le Prestataire agit en qualité de <b>sous-traitant</b> au sens de l'art. 28 du RGPD pour le compte du Client. Les traitements sont effectués exclusivement aux fins de l'exécution du Contrat. Les données sont hébergées dans l'Union Européenne, chiffrées en transit (TLS 1.3) et au repos.</p>
          <p className="mb-2"><b>Sous-traitants ultérieurs autorisés</b> (le Client accepte expressément le recours à ces sous-traitants pour l'exécution du service) :</p>
          <ul className="ml-6 mb-2 list-disc text-xs">
            <li><b>Railway Corp.</b> (États-Unis, infrastructure déployée en UE) — hébergement applicatif et base de données</li>
            <li><b>NovaTech</b> — opération des modèles d'intelligence artificielle et de leur infrastructure d'exécution, pour les fonctionnalités IA exclusivement. Les requêtes IA ne contiennent que les données strictement nécessaires (texte de menu, photos, message du client) et ne sont pas utilisées pour entraîner les modèles.</li>
            <li><b>Stripe Payments Europe Ltd</b> (Irlande) — traitement des paiements et acomptes, lorsque le module Réservations est activé</li>
            <li><b>Resend Inc.</b> — service d'envoi d'emails transactionnels</li>
            <li><b>GitHub Inc.</b> — versionnage du code source (aucune donnée client n'y est stockée)</li>
          </ul>
          <p className="mb-2">Toute personne concernée dispose d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité auprès du Client (responsable de traitement). Une demande peut être adressée au délégué à la protection des données du Prestataire : <b>{vendor.email}</b>.</p>
          <p className="mb-3">En cas de violation de données, le Prestataire notifie le Client dans les <b>72 heures</b>. À la fin du Contrat, les données sont restituées au Client puis détruites sous 30 jours, sauf obligation légale de conservation.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 12 — Cookies & traceurs</h2>
          <p className="mb-3">La Plateforme utilise des cookies strictement nécessaires à son fonctionnement (session, authentification). Aucun cookie publicitaire ou de profilage tiers n'est déployé. Le Client est informé qu'il peut configurer son navigateur pour refuser les cookies, ce qui peut altérer l'usage de la Plateforme.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 13 — Limitation de responsabilité</h2>
          <p className="mb-3">La responsabilité du Prestataire est limitée aux dommages directs prévisibles. En tout état de cause, elle ne pourra excéder le montant total HT effectivement payé par le Client au titre des 12 derniers mois précédant le fait générateur. Le Prestataire ne saurait être tenu responsable des dommages indirects (perte d'exploitation, perte de chiffre d'affaires, perte de données du fait du Client).</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 14 — Force majeure</h2>
          <p className="mb-3">Aucune des Parties ne pourra être tenue responsable d'un manquement résultant d'un cas de force majeure au sens de l'art. 1218 du Code civil (catastrophe naturelle, panne d'infrastructure massive, décision étatique, etc.). La Partie empêchée informera l'autre dans les meilleurs délais.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 15 — Modification des CGV/CGU</h2>
          <p className="mb-3">Le Prestataire se réserve le droit de modifier les présentes CGV/CGU. Toute modification substantielle sera notifiée au Client par email au moins 30 jours avant son entrée en vigueur. Le Client pourra résilier sans frais si la modification lui est défavorable.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 16 — Médiation & litiges</h2>
          <p className="mb-3">Tout différend fera l'objet d'une tentative de résolution amiable préalable par échange écrit. À défaut d'accord dans un délai de 30 jours, le litige sera soumis aux <b>tribunaux compétents du ressort du siège social du Prestataire</b>. Le présent contrat est soumis au droit français.</p>

          <div className="mt-8 pt-4 border-t text-xs text-gray-500 italic">
            <p>CGV/CGU générées le {docMeta.date} — version {docMeta.numero}. Pour toute question : {vendor.email}.</p>
          </div>
        </div>
      )}

      {/* ===== ONBOARDING ===== */}
      {docType === "onboarding" && (
        <div>
          <p className="text-xs text-gray-500 mb-6 italic">Fiche d'activation à compléter conjointement par le Client et le Prestataire lors de la mise en service.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">1. Identité de l'établissement</h2>
          <table className="w-full text-sm mb-6">
            <tbody>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Raison sociale</td><td className="p-2"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.name || "—"}</span></td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">URL publique</td><td className="p-2">https://matable.pro/r/<span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.slug || "[slug]"}</span></td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">SIRET</td><td className="p-2"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.siret || "—"}</span></td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Adresse</td><td className="p-2"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.address || "—"}</span></td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Chef / Gérant</td><td className="p-2"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.managerName || "—"}</span></td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Email principal</td><td className="p-2"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.email || "—"}</span></td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Téléphone</td><td className="p-2"><span className="bg-orange-50 font-bold text-orange-800 border border-orange-200 px-2 py-1 rounded">{clientData.phone || "—"}</span></td></tr>
            </tbody>
          </table>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">2. Configuration métier</h2>
          <table className="w-full text-sm mb-6">
            <tbody>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Nombre de tables</td><td className="p-2">_________</td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Nombre de couverts</td><td className="p-2">_________</td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Nombre de serveurs</td><td className="p-2">_________</td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Type d'établissement</td><td className="p-2">[ ] Restaurant · [ ] Bar · [ ] Salon de thé · [ ] Boutique alimentaire · [ ] Autre : ______</td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Horaires d'ouverture</td><td className="p-2">_________________________________________________</td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Réservations en ligne</td><td className="p-2">[ ] Oui · [ ] Non — si oui, acompte : ____ € par couvert</td></tr>
            </tbody>
          </table>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">3. Modules à activer</h2>
          <table className="w-full text-sm mb-6">
            <tbody>
              <tr className="border-b"><td className="p-2 w-2/3">Avis Google & Réputation</td><td className="p-2 text-center">[ ✓ ]</td></tr>
              <tr className="border-b"><td className="p-2">QR Codes & Commande à table</td><td className="p-2 text-center">[ ✓ ]</td></tr>
              <tr className="border-b"><td className="p-2">Portail Serveur (PIN à choisir)</td><td className="p-2 text-center">[ ✓ ] — PIN : ______</td></tr>
              <tr className="border-b"><td className="p-2">Cuisine Live (PIN cuisine)</td><td className="p-2 text-center">[ ✓ ] — PIN : ______</td></tr>
              <tr className="border-b"><td className="p-2">Caisse (PIN caisse)</td><td className="p-2 text-center">[ ✓ ] — PIN : ______</td></tr>
              <tr className="border-b"><td className="p-2">Nova IA (clé Ollama fournie par MaTable)</td><td className="p-2 text-center">[ ✓ ]</td></tr>
              <tr className="border-b"><td className="p-2">Gestion de stock IA</td><td className="p-2 text-center">[ ✓ ]</td></tr>
              <tr className="border-b"><td className="p-2">Réservations en ligne (Stripe)</td><td className="p-2 text-center">[ ] à activer</td></tr>
            </tbody>
          </table>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">4. Intégrations tierces</h2>
          <table className="w-full text-sm mb-6">
            <tbody>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Google Business Profile</td><td className="p-2">URL : ___________________________ · Place ID : __________</td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Stripe (pour pourboires + acomptes)</td><td className="p-2">Compte connecté : [ ] Oui [ ] Non — ID : __________</td></tr>
              <tr className="border-b"><td className="p-2 font-bold w-1/3">Domaine personnalisé</td><td className="p-2">[ ] Standard matable.pro/r/{clientData.slug || "slug"} · [ ] Custom : ____________</td></tr>
            </tbody>
          </table>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">5. Checklist de mise en service</h2>
          <ul className="space-y-2 text-sm ml-2">
            <li>[ ] Contrat d'abonnement signé et premier paiement reçu</li>
            <li>[ ] Compte créé et identifiants envoyés au gérant</li>
            <li>[ ] Menu importé (Magic Scan ou saisie manuelle)</li>
            <li>[ ] Tables créées (nombre, capacité, zone)</li>
            <li>[ ] Serveurs créés avec PIN individuels</li>
            <li>[ ] PIN caisse + cuisine configurés</li>
            <li>[ ] QR codes générés et imprimés (au moins 1 par table)</li>
            <li>[ ] Google Business Profile lié pour publication d'avis</li>
            <li>[ ] Page publique vérifiée (URL, photos, description)</li>
            <li>[ ] Formation gérant + équipe (15 min visio)</li>
            <li>[ ] Test commande end-to-end : client → serveur → cuisine → caisse</li>
            <li>[ ] Test envoi d'avis Google</li>
          </ul>

          <div className="grid grid-cols-2 gap-6 mt-10">
            <div className="border rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Mise en service réalisée par</h3>
              <p className="text-xs text-gray-500 mb-1">{vendor.representant}</p>
              <p className="text-xs text-gray-500">Date : __________________</p>
              <div className="border-b h-10 mt-3"></div>
            </div>
            <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Acceptation client</h3>
              <p className="text-xs text-orange-700 mb-1">{clientData.managerName || "—"}</p>
              <p className="text-xs text-orange-700">Date : __________________</p>
              <div className="border-b border-orange-200 h-10 mt-3"></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONTRAT DE PRESTATION (transitoire, personne physique) ===== */}
      {docType === "prestation" && (
        <div>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-6 rounded-r">
            <p className="text-xs text-amber-900 leading-relaxed">
              <b>⚠ Contrat transitoire</b> — Le présent contrat est conclu en attendant l'immatriculation
              de la société du Prestataire. Une fois celle-ci effective, les Parties conviennent de signer
              un <b>Contrat d'Abonnement</b> au nom de la société pour formaliser la relation commerciale
              dans la durée (voir Article 10).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Le Prestataire (personne physique)</h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-500">Nom et prénom : <span className="text-black font-bold">{vendor.representant}</span></p>
                <p className="text-gray-500">Agissant en qualité de : <span className="text-black font-bold">personne physique, en attente d'immatriculation de la société <i>{vendor.raisonSociale}</i></span></p>
                <p className="text-gray-500">Adresse : <span className="text-black font-bold">{vendor.address}</span></p>
                <p className="text-gray-500">N° SIRET : <span className="text-black font-bold">{PH(vendor.siret, "Non encore immatriculé — IMAT en cours")}</span></p>
                <p className="text-gray-500">Email : <span className="text-black font-bold">{vendor.email}</span></p>
                <p className="text-gray-500">Téléphone : <span className="text-black font-bold">{vendor.phone}</span></p>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Le Bénéficiaire</h3>
              <div className="text-sm space-y-2">
                <p className="text-orange-900">Établissement : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.name || "..."}</span></p>
                <p className="text-orange-900">Représentant : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.managerName || "..."}</span></p>
                <p className="text-orange-900">Adresse : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.address || "..."}</span></p>
                <p className="text-orange-900">SIRET : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.siret || "..."}</span></p>
                <p className="text-orange-900">Email : <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200">{clientData.email || "..."}</span></p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-6 italic">Ci-après désignés ensemble « les Parties ». Il a été convenu ce qui suit :</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 1 — Objet de la prestation</h2>
          <p className="text-sm mb-3 leading-relaxed whitespace-pre-line">{prestation.description}</p>
          <p className="text-sm mb-3 leading-relaxed">Cette prestation comprend l'accès à la plateforme Ma Table et à l'ensemble de ses modules : Avis Google, QR Commande, Portail Serveur, Cuisine Live, Caisse, Nova IA, Stock IA, Réservations. L'accompagnement technique (formation, mise en service, support) est inclus.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 2 — Durée & reconduction</h2>
          <p className="text-sm mb-3 leading-relaxed">
            La prestation est fournie <b>mois par mois, sans engagement de durée</b>. Elle se renouvelle
            tacitement à chaque période mensuelle, sauf préavis de <b>15 jours</b> notifié par email avant
            la fin de la période en cours. Aucune indemnité de résiliation n'est due.
          </p>
          <p className="text-sm mb-3 leading-relaxed">Délai de mise en service : <b>{prestation.delaiLivraison}</b>.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 3 — Rémunération</h2>
          <table className="w-full text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Désignation</th>
                <th className="p-3 text-right">Montant HT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3"><b>Prestation mensuelle — Plan complet MaTable</b><br/><span className="text-xs text-gray-500">Tous modules + accompagnement inclus</span></td>
                <td className="p-3 text-right">{prestation.montantHT.toFixed(2)} €</td>
              </tr>
              <tr className="bg-gray-50 font-black">
                <td className="p-3">TOTAL HT / mois</td>
                <td className="p-3 text-right text-orange-500">{prestation.montantHT.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-2"><b>Modalités :</b> {prestation.modalites}</p>
          <p className="text-xs text-gray-500 italic mb-3">TVA non applicable — le Prestataire agissant en qualité de personne physique non assujettie à la TVA dans le cadre de cette prestation transitoire (art. 293B du CGI applicable à l'immatriculation future).</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 4 — Limite raisonnable d'utilisation de l'IA</h2>
          <p className="text-sm mb-3 leading-relaxed">
            L'accès aux fonctionnalités IA (Nova IA, Magic Scan, descriptions, chatbot, finance assistée) est
            fourni dans la limite d'un <b>usage professionnel raisonnable</b>. Au-delà d'un seuil correspondant
            à <b>deux fois la moyenne d'utilisation</b> constatée chez les clients comparables, le service IA pourra être
            <b> temporairement restreint</b>. Une extension de quota est possible sur devis préalable auprès du Prestataire.
          </p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 5 — Propriété intellectuelle</h2>
          <p className="text-sm mb-3 leading-relaxed">La plateforme Ma Table et ses composants restent la propriété exclusive du Prestataire. Le Bénéficiaire ne dispose que d'un droit d'usage temporaire pendant la durée de la prestation. Les <b>données saisies par le Bénéficiaire</b> (menu, clients, avis, commandes) restent sa pleine propriété.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 6 — Obligations du Bénéficiaire</h2>
          <p className="text-sm mb-3 leading-relaxed">Le Bénéficiaire fournit tous les éléments nécessaires à la mise en service (menu, photos, coordonnées Google Business, etc.). Il conserve la confidentialité de ses identifiants et codes PIN. Il s'engage à un usage conforme à l'objet de la prestation.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 7 — Données personnelles (RGPD)</h2>
          <p className="text-sm mb-3 leading-relaxed">Le Prestataire agit en qualité de sous-traitant au sens de l'art. 28 du RGPD pour les données personnelles confiées par le Bénéficiaire. Les données sont hébergées dans l'Union Européenne (Railway, région Frankfurt) et chiffrées. À la fin de la prestation, elles sont restituées au Bénéficiaire ou détruites sur demande sous 30 jours.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 8 — Force majeure</h2>
          <p className="text-sm mb-3 leading-relaxed">Aucune Partie ne saurait être tenue responsable d'un manquement résultant d'un cas de force majeure au sens de l'art. 1218 du Code civil.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 9 — Résiliation</h2>
          <p className="text-sm mb-3 leading-relaxed">Outre la résiliation pour convenance (art. 2 — préavis 15 jours), chaque Partie peut résilier à effet immédiat en cas de manquement grave de l'autre, 15 jours après mise en demeure restée infructueuse. Les sommes déjà versées restent acquises au Prestataire à concurrence des prestations effectivement réalisées.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 10 — Transition vers un Contrat d'Abonnement</h2>
          <p className="text-sm mb-3 leading-relaxed">
            Dès l'<b>immatriculation effective</b> de la société du Prestataire (obtention du numéro SIRET),
            les Parties conviennent de signer un <b>Contrat d'Abonnement</b> standard au nom de ladite société,
            qui remplacera et complétera le présent contrat. Les sommes déjà versées au titre des présentes
            seront, le cas échéant, imputées sur la première mensualité du nouvel abonnement.
            Le Bénéficiaire reste libre, à ce moment, de ne pas souscrire au Contrat d'Abonnement
            (sans pénalité), auquel cas la prestation prend fin à la fin de la période mensuelle en cours.
          </p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 11 — Loi applicable & juridiction</h2>
          <p className="text-sm mb-6 leading-relaxed">Le présent Contrat est soumis au droit français. Tout différend non résolu à l'amiable dans un délai de 30 jours sera porté devant les tribunaux compétents du domicile du Prestataire (personne physique).</p>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="border rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Le Prestataire</h3>
              <p className="text-xs text-gray-500 mb-2">Précédé de la mention manuscrite « lu et approuvé »</p>
              <div className="border-b h-14 mb-2"></div>
              <p className="text-xs text-gray-500">{vendor.representant} — Personne physique<br/>Date : {docMeta.date}</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Le Bénéficiaire</h3>
              <p className="text-xs text-orange-700 mb-2">Précédé de la mention manuscrite « lu et approuvé »</p>
              <div className="border-b border-orange-200 h-14 mb-2"></div>
              <p className="text-xs text-orange-900"><span className="font-bold bg-white px-1 rounded">{clientData.managerName || "..."}</span> — Date : {docMeta.date}</p>
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

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Modules inclus dans l'abonnement</h2>
          <table className="w-full text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-black text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3">Module</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3">Détails</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-3"><b>Avis Google & Réputation</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">IA conversationnelle post-repas, publication assistée</td></tr>
              <tr className="border-b"><td className="p-3"><b>QR Codes & Commande à table</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">QR illimités, commande client autonome</td></tr>
              <tr className="border-b"><td className="p-3"><b>Portail Serveur</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">App mobile équipe, attribution table, sessions</td></tr>
              <tr className="border-b"><td className="p-3"><b>Cuisine Live</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">Écran cuisine temps réel, statuts plats</td></tr>
              <tr className="border-b"><td className="p-3"><b>Caisse intégrée</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">Fermeture sessions, modes paiement, pourboires</td></tr>
              <tr className="border-b"><td className="p-3"><b>Nova IA</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">Magic Scan, descriptions, planning, chatbot, finance</td></tr>
              <tr className="border-b"><td className="p-3"><b>Gestion de stock IA</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">Suivi ingrédients, alertes, prédictions</td></tr>
              <tr className="border-b"><td className="p-3"><b>Réservations en ligne</b></td><td className="p-3 text-center text-emerald-600">✓ Actif</td><td className="p-3 text-xs text-gray-500">Calendrier, acompte Stripe, politique annulation</td></tr>
              <tr className="bg-orange-50 font-black"><td className="p-3">TOTAL HT mensuel</td><td className="p-3 text-center">—</td><td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-4">Plan complet : tous les modules sont inclus dans l'abonnement, sans surcoût par module ou par utilisateur.</p>

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
          <div className="border rounded-lg p-3 min-h-[80px] text-xs text-gray-500 italic mb-4">
            (à compléter — date de signature, mises à jour de tarif, suspensions, mode de paiement modifié, etc.)
          </div>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Contacts</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border rounded-lg p-3">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Côté Client</p>
              <p className="text-sm"><b>{clientData.managerName || "—"}</b></p>
              <p className="text-xs text-gray-600">{clientData.email || "—"}</p>
              <p className="text-xs text-gray-600">{clientData.phone || "—"}</p>
            </div>
            <div className="border rounded-lg p-3 bg-orange-50/40">
              <p className="text-xs uppercase tracking-wider text-orange-600 font-bold mb-1">Account Manager MaTable</p>
              <p className="text-sm"><b>{vendor.representant}</b></p>
              <p className="text-xs text-gray-600">{vendor.email}</p>
              <p className="text-xs text-gray-600">{vendor.phone}</p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t text-xs text-gray-500 italic">
            <p>Fiche interne — usage Account Manager. Établie le {docMeta.date} par {vendor.representant} — {vendor.raisonSociale}.</p>
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
