"use client";

import { forwardRef } from "react";
import { computeQuote, MODULES, DURATIONS, eur } from "./pricing";
import type { DurationKey, ModuleId, QuoteLine, Quote } from "./pricing";

// ───────────────────────────────────────────────────────────────────────────
// Bannière latérale décorative — signature visuelle MaTable (6 mm)
//
// Calibré pour rester économe en encre AUSSI EN NOIR & BLANC.
// Toutes opacités SVG ≤ 0.30 → ~10-15 % gris en N&B = quasi gratuit.
// Composition : grille hexagonale + nodes réseau + wordmark vertical
// + micro-blocs QR-like (anti-contrefaçon).
// ───────────────────────────────────────────────────────────────────────────
function SideBanner({ side }: { side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        [side]: 0,
        top: 0,
        bottom: 0,
        width: "6mm",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 1120"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Grille hexagonale — taille adaptée à 6 mm */}
          <pattern id={`hex-${side}`} x="0" y="0" width="12" height="20.78" patternUnits="userSpaceOnUse">
            <polygon
              points="6,0.5 11.5,3.5 11.5,10.5 6,13.5 0.5,10.5 0.5,3.5"
              fill="none"
              stroke="#fb923c"
              strokeWidth="0.3"
              opacity="0.28"
            />
            <polygon
              points="12,11 17.5,14 17.5,21 12,24 6.5,21 6.5,14"
              fill="none"
              stroke="#fb923c"
              strokeWidth="0.3"
              opacity="0.28"
            />
            <circle cx="6" cy="13.5" r="0.5" fill="#fb923c" opacity="0.3" />
          </pattern>
          {/* Nodes réseau — version compacte */}
          <pattern id={`nodes-${side}`} x="0" y="0" width="24" height="180" patternUnits="userSpaceOnUse">
            <line x1="5" y1="20" x2="18" y2="55" stroke="#fb923c" strokeWidth="0.3" opacity="0.22" />
            <line x1="18" y1="55" x2="7" y2="100" stroke="#fb923c" strokeWidth="0.3" opacity="0.22" />
            <line x1="7" y1="100" x2="20" y2="145" stroke="#fb923c" strokeWidth="0.3" opacity="0.22" />
            <circle cx="5" cy="20" r="1.1" fill="#fb923c" opacity="0.32" />
            <circle cx="18" cy="55" r="0.9" fill="#fb923c" opacity="0.32" />
            <circle cx="7" cy="100" r="1.3" fill="#fb923c" opacity="0.35" />
            <circle cx="20" cy="145" r="0.9" fill="#fb923c" opacity="0.32" />
          </pattern>
        </defs>

        {/* Couches : grille hexagonale + nodes réseau */}
        <rect x="0" y="0" width="24" height="1120" fill={`url(#hex-${side})`} />
        <rect x="0" y="0" width="24" height="1120" fill={`url(#nodes-${side})`} />

        {/* Fines barres haut et bas */}
        <rect x="0" y="0" width="24" height="1.5" fill="#f97316" opacity="0.6" />
        <rect x="0" y="1118.5" width="24" height="1.5" fill="#f97316" opacity="0.6" />

        {/* Wordmark vertical répété — police 3.5 pour rentrer dans 6 mm */}
        <g transform="rotate(-90, 12, 200)">
          <text x="12" y="200" textAnchor="middle" fontSize="3.5" fontFamily="Arial, sans-serif" fontWeight="900" fill="#f97316" opacity="0.32" letterSpacing="1.5">
            MATABLE.PRO · MATABLE.PRO · MATABLE.PRO
          </text>
        </g>
        <g transform="rotate(-90, 12, 560)">
          <text x="12" y="560" textAnchor="middle" fontSize="3.5" fontFamily="Arial, sans-serif" fontWeight="900" fill="#f97316" opacity="0.32" letterSpacing="1.5">
            MATABLE.PRO · MATABLE.PRO · MATABLE.PRO
          </text>
        </g>
        <g transform="rotate(-90, 12, 920)">
          <text x="12" y="920" textAnchor="middle" fontSize="3.5" fontFamily="Arial, sans-serif" fontWeight="900" fill="#f97316" opacity="0.32" letterSpacing="1.5">
            MATABLE.PRO · MATABLE.PRO · MATABLE.PRO
          </text>
        </g>

        {/* Micro-blocs QR — anti-contrefaçon discret, gris pour rester visible en N&B */}
        <g opacity="0.32">
          <rect x="8" y="280" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="11.5" y="280" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="8" y="283.5" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="14" y="283.5" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="11.5" y="287" width="1.8" height="1.8" fill="#1f2937" />

          <rect x="7" y="780" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="10.5" y="780" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="13" y="783.5" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="7" y="787" width="1.8" height="1.8" fill="#1f2937" />
          <rect x="10.5" y="787" width="1.8" height="1.8" fill="#1f2937" />
        </g>
      </svg>
    </div>
  );
}

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

// ───────────────────────────────────────────────────────────────────────────
// Carte flyer générique — format A5 paysage (210×148.5 mm)
// Non personnalisée, prête à imprimer en masse pour distribution.
// ───────────────────────────────────────────────────────────────────────────
function FlyerCard({ vendor }: { vendor: Vendor }) {
  return (
    <div
      style={{
        width: "100%",            // remplit la largeur A4 (210mm)
        height: "138mm",          // ≈ A5 paysage (148.5) − marges de coupe
        padding: "8mm 10mm",
        boxSizing: "border-box",
        border: "1px solid #fed7aa",
        borderRadius: "4mm",
        position: "relative",
        background: "white",
        fontFamily: "Arial, sans-serif",
        color: "#1a1a1a",
        display: "flex",
        flexDirection: "row",
        gap: "8mm",
      }}
    >
      {/* Coin gauche : pitch */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "9px", letterSpacing: "3px", color: "#f97316", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
            MaTable.Pro
          </p>
          <h1 style={{ fontSize: "26px", fontWeight: 900, lineHeight: 1.05, margin: "6px 0 0 0" }}>
            Triplez vos avis<br/>Google.<br/>
            <span style={{ color: "#f97316" }}>Zéro effort.</span>
          </h1>

          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⭐</span>
              <span style={{ fontSize: "11px" }}><b>+200 %</b> d'avis Google authentiques</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚡</span>
              <span style={{ fontSize: "11px" }}><b>Commande à table</b> par QR — service +30 %</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>🤖</span>
              <span style={{ fontSize: "11px" }}><b>Nova IA</b> incluse — menu, descriptions, finance</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>💰</span>
              <span style={{ fontSize: "11px" }}><b>+15 %</b> de pourboires moyens</span>
            </div>
          </div>
        </div>
        <p style={{ fontSize: "8px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
          Plateforme tout-en-un · Mise en service sous 7 jours · matable.pro
        </p>
      </div>

      {/* Coin droit : prix + CTA */}
      <div style={{
        width: "62mm",
        background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
        border: "2px solid #f97316",
        borderRadius: "3mm",
        padding: "8mm 6mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        textAlign: "center",
      }}>
        <div>
          <p style={{ fontSize: "8px", color: "#9a3412", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 900, margin: 0 }}>Modulaire dès</p>
          <p style={{ fontSize: "42px", color: "#f97316", fontWeight: 900, lineHeight: 1, margin: "4px 0" }}>79 €</p>
          <p style={{ fontSize: "10px", color: "#4b5563", margin: 0 }}>HT / mois</p>
          <p style={{ fontSize: "8px", color: "#6b7280", margin: "2px 0 0 0", fontStyle: "italic" }}>7 modules · jusqu'à −20 % volume</p>
        </div>

        <div style={{ marginTop: "8px" }}>
          <p style={{ fontSize: "8px", color: "#9a3412", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, margin: 0 }}>Démo gratuite · 15 min</p>
          <p style={{ fontSize: "16px", color: "#111827", fontWeight: 900, margin: "4px 0 0 0" }}>📞 {vendor.phone}</p>
          <p style={{ fontSize: "9px", color: "#f97316", fontWeight: 700, margin: "2px 0 0 0" }}>{vendor.email}</p>
          <p style={{ fontSize: "8px", color: "#6b7280", fontStyle: "italic", margin: "3px 0 0 0" }}>Demandez {vendor.representant}</p>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Feuille A4 portrait avec 2 flyers + ligne de coupe pointillée
// L'utilisateur imprime 1 page = obtient 2 flyers à découper.
// Pour 50 flyers → 25 copies dans le dialog d'impression.
// ───────────────────────────────────────────────────────────────────────────
function FlyerSheet({ vendor }: { vendor: Vendor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "-12mm -6mm" }}>
      <FlyerCard vendor={vendor} />
      {/* Ligne de coupe — pointillés + ciseau */}
      <div style={{
        position: "relative",
        height: "8mm",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "2mm 0",
      }}>
        <div style={{ flex: 1, borderTop: "1.5px dashed #cbd5e1" }} />
        <span style={{ padding: "0 6px", fontSize: "10px", color: "#94a3b8" }}>✂  découper</span>
        <div style={{ flex: 1, borderTop: "1.5px dashed #cbd5e1" }} />
      </div>
      <FlyerCard vendor={vendor} />
      <p style={{ fontSize: "8px", color: "#cbd5e1", fontStyle: "italic", textAlign: "center", marginTop: "6mm" }}>
        Pour imprimer une stack de 50 flyers : choisir <b>25 copies</b> dans le dialog d'impression. Recto seul.
      </p>
    </div>
  );
}

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
  // Champs historiques (rétro-compat)
  monthly: number;
  total: number;
  mult: string;
  // Champs détaillés (nouveaux — voir pricing.ts)
  modules?: Array<{ id: string; name: string; desc: string; basePrice: number; unitPrice: number; required: boolean }>;
  subtotal?: number;
  volumePercent?: number;
  volumeAmount?: number;
  durationKey?: string;
  durationLabel?: string;
  realMult?: number;
  isAnnualPay?: boolean;
  annualPayTotal?: number;
};

export type DocType = "contrat" | "prestation" | "devis" | "devis-chaine" | "facture" | "cgvu" | "onboarding" | "tarification" | "plaquette" | "plaquette-eco" | "plaquette-premium" | "plaquette-compact" | "plaquette-chaine" | "flyer" | "tuto-avis" | "tuto-commande" | "tuto-avis-eco" | "plaquette-avis-focus" | "plaquette-menu-focus" | "tuto-reservations" | "tuto-reservations-eco" | "tuto-nova-ia";

// Ligne d'établissement pour les devis chaîne
export type ChainEstablishment = {
  id: string;
  name: string;
  city?: string;
  modules: string[];           // ids depuis MODULES
  engagement: string;          // "3m" | "6m" | "9m" | "12m" | "12a"
  monthlyHt: number;           // tarif négocié (saisie libre)
  notes?: string;
};

export type ChainQuote = {
  establishments: ChainEstablishment[];
  groupDiscountPercent: number;    // remise groupe sur le total
  setupFeeHt: number;              // frais d'installation groupe (saisie libre)
  notes?: string;
};

type Props = {
  docType: DocType;
  vendor: Vendor;
  clientData: ClientData;
  docMeta: DocMeta;
  engagement: string;
  prestation: Prestation;
  priceInfo: PriceInfo;
  chainQuote?: ChainQuote;
  tutoQrCode?: string; // data URL du vrai QR code restaurant (tuto-avis)
};

const DocumentTemplate = forwardRef<HTMLDivElement, Props>(function DocumentTemplate(
  { docType, vendor, clientData, docMeta, engagement, prestation, priceInfo, chainQuote, tutoQrCode },
  ref
) {
  return (
    <div
      ref={ref}
      className="bg-white"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "18mm 14mm 18mm 14mm",  // 14 mm latéral = 6 mm bannière + 8 mm air avant le texte
        position: "relative",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        fontFamily: "Arial, sans-serif",
        color: "#1a1a1a",
      }}
    >
      {/* Bannières décoratives sur les deux côtés — signature visuelle MaTable */}
      <SideBanner side="left" />
      <SideBanner side="right" />

      {/* Contenu principal au-dessus des bannières */}
      <div style={{ position: "relative", zIndex: 1 }}>

      {/* Header commun */}
      <div className="flex justify-between items-start border-b-2 border-orange-500 pb-5 mb-8">
        <div className="text-2xl font-black">
          MaTable<span className="text-orange-500">.Pro</span>
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

      {/* Pour les plaquettes et le flyer : pas de titre rigide, le template gère son propre hero */}
      {docType !== "plaquette" && docType !== "plaquette-eco" && docType !== "plaquette-premium" && docType !== "plaquette-compact" && docType !== "plaquette-chaine" && docType !== "flyer" && docType !== "tuto-avis" && docType !== "tuto-commande" && docType !== "tuto-avis-eco" && docType !== "plaquette-avis-focus" && docType !== "plaquette-menu-focus" && docType !== "tuto-reservations" && docType !== "tuto-reservations-eco" && docType !== "tuto-nova-ia" && (
        <h1 className="text-xl font-black uppercase tracking-widest text-center mb-8 pb-4 border-b">
          {docType === "contrat" && "Contrat d'Abonnement — Plateforme MaTable.Pro"}
          {docType === "prestation" && "Contrat de Prestation — MaTable.Pro"}
          {docType === "devis" && "Devis — Abonnement MaTable.Pro"}
          {docType === "facture" && "Facture — Abonnement MaTable.Pro"}
          {docType === "cgvu" && "Conditions Générales de Vente et d'Utilisation"}
          {docType === "onboarding" && "Fiche d'Activation — MaTable.Pro"}
          {docType === "tarification" && "Fiche Tarification & Suivi Client"}
          {docType === "devis-chaine" && "Devis Groupe / Chaîne — MaTable.Pro"}
        </h1>
      )}

      {/* ===== CONTRAT D'ABONNEMENT ===== */}
      {docType === "contrat" && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Le Prestataire</h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-500">Raison sociale : <span className="text-black font-bold">{vendor.raisonSociale}</span></p>
                <p className="text-gray-500">Forme juridique : <span className="text-black font-bold">{PH(vendor.formeJuridique, "Forme juridique")}</span></p>
                <p className="text-gray-500">SIRET : <span className="text-black font-bold">{PH(vendor.siret, "10511115700019")}</span></p>
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
          <p className="text-sm mb-3 leading-relaxed">Le présent contrat (« <b>le Contrat</b> ») a pour objet de définir les conditions dans lesquelles le Prestataire met à disposition du Client, sous forme de service en ligne (SaaS), l'accès à la plateforme <b>MaTable.Pro</b> ainsi qu'aux modules choisis. Le Prestataire conserve la pleine propriété de la plateforme, de son code et de ses contenus.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 2 — Modules souscrits & Tarifs</h2>
          <table className="w-full text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-900 text-left text-xs uppercase tracking-wider border-y-2 border-orange-500">
                <th className="p-3">Module souscrit</th>
                <th className="p-3 text-right">Prix HT / mois</th>
              </tr>
            </thead>
            <tbody>
              {(priceInfo.modules ?? []).map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-3">
                    <b>{m.name}</b>{m.required && <span className="text-xs text-orange-600 italic"> · requis</span>}
                    {m.id === "finance" || m.id === "stock" || m.id === "contab" ? <span className="text-xs text-gray-500"> (NovaTech IA — voir art. 4 bis)</span> : null}
                    <br/><span className="text-xs text-gray-500">{m.desc}</span>
                  </td>
                  <td className="p-3 text-right">{m.unitPrice.toFixed(2)} €</td>
                </tr>
              ))}
              <tr className="border-b text-xs">
                <td className="p-3 text-gray-500 text-right">Sous-total HT mensuel ({priceInfo.modules?.length ?? 0} module{(priceInfo.modules?.length ?? 0) > 1 ? "s" : ""}) — engagement {priceInfo.durationLabel ?? "12 mois"}</td>
                <td className="p-3 text-right">{(priceInfo.subtotal ?? priceInfo.monthly).toFixed(2)} €</td>
              </tr>
              {(priceInfo.volumePercent ?? 0) > 0 && (
                <tr className="border-b text-xs text-emerald-700">
                  <td className="p-3 text-right">Remise volume ({priceInfo.volumePercent} %)</td>
                  <td className="p-3 text-right">− {(priceInfo.volumeAmount ?? 0).toFixed(2)} €</td>
                </tr>
              )}
              <tr className="bg-gray-50 font-black">
                <td className="p-3">TOTAL MENSUEL HT</td>
                <td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              {priceInfo.isAnnualPay && (
                <tr className="bg-orange-50/40 text-xs">
                  <td className="p-3 text-right text-orange-700">Paiement annuel à la signature (12 mois)</td>
                  <td className="p-3 text-right font-black text-orange-700">{(priceInfo.annualPayTotal ?? priceInfo.monthly * 12).toFixed(2)} €</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-4">
            Hébergement, mises à jour et support inclus. {vendor.tvaIntracom ? `TVA intracommunautaire : ${vendor.tvaIntracom}. Prix exprimés HT.` : "TVA non applicable, art. 293B du CGI."}
            {priceInfo.durationKey && priceInfo.durationKey !== "3m" && (
              <> Tarifs unitaires affichés avec la réduction engagement {priceInfo.durationLabel} ({priceInfo.mult}) appliquée par rapport au prix de base (3 mois).</>
            )}
          </p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 3 — Durée & Engagement</h2>
          <p className="text-sm mb-3 leading-relaxed">Le Contrat est conclu pour une durée ferme minimale de <b className="text-orange-700 bg-orange-50 px-1">{engagement.replace('m', ' mois').replace('a', ' mois (paiement annuel)')}</b> à compter de sa date de signature, période durant laquelle aucune résiliation anticipée n'est possible sauf cas prévus à l'article 9. À l'issue de cette période, le Contrat se renouvelle <b>tacitement par périodes successives d'un mois</b>, sauf résiliation notifiée par l'une des Parties au moins 30 jours avant l'échéance, par email avec accusé de réception.</p>
          <p className="text-sm mb-3 leading-relaxed text-gray-600 italic">
            Le prix de base s'entend pour un engagement de 3 mois. Plus l'engagement choisi est long, plus la réduction est forte :
            6 mois (<b>−2 %</b>) · 9 mois (<b>−4 %</b>) · 12 mois (<b>−7 %</b>) · 12 mois en paiement annuel (<b>−12 %</b>).
          </p>

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
          <p className="text-sm mb-3 leading-relaxed">La plateforme MaTable.Pro, sa marque, son code, ses interfaces et l'ensemble des contenus qu'elle contient (hors données client) sont la propriété exclusive du Prestataire. Le Contrat confère au Client un <b>droit d'usage personnel, non-exclusif et non-transférable</b> pendant la durée du Contrat. Toute reproduction, décompilation ou diffusion est strictement interdite.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 8 — Confidentialité</h2>
          <p className="text-sm mb-3 leading-relaxed">Chacune des Parties s'engage à conserver confidentielles toutes informations dont elle aurait connaissance dans le cadre du Contrat, et à ne les divulguer à aucun tiers sans l'accord écrit de l'autre Partie. Cette obligation perdure 3 ans après la fin du Contrat.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 9 — Résiliation</h2>
          <p className="text-sm mb-3 leading-relaxed">En cas de manquement grave de l'une des Parties à ses obligations, l'autre Partie pourra résilier le Contrat de plein droit, 30 jours après mise en demeure restée infructueuse, sans préjudice de dommages et intérêts. Une <b>résiliation anticipée à l'initiative du Client</b> avant la fin de la période d'engagement entraîne le paiement intégral des mensualités restant dues, sans qu'il soit besoin de mise en demeure.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 10 — Force majeure</h2>
          <p className="text-sm mb-3 leading-relaxed">Aucune des Parties ne pourra être tenue responsable d'un manquement résultant d'un cas de force majeure au sens de l'art. 1218 du Code civil. La Partie empêchée informera l'autre dans les meilleurs délais ; les obligations seront suspendues le temps de l'événement.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 11 — Loi applicable & juridiction</h2>
          <p className="text-sm mb-6 leading-relaxed">Le Contrat est soumis au droit français. Tout différend non résolu à l'amiable dans un délai de 30 jours sera porté devant le Tribunal de Commerce de Créteil, compétent au titre du siège social du Prestataire (RCS Créteil — SIRET {vendor.siret || "10511115700019"}).</p>

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
                SIRET : {PH(vendor.siret, "10511115700019")}<br/>
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
              <tr className="bg-orange-50 text-orange-900 text-left text-xs uppercase tracking-wider border-y-2 border-orange-500">
                <th className="p-3">Désignation</th>
                <th className="p-3">Période</th>
                <th className="p-3 text-center">Qté</th>
                <th className="p-3 text-right">Prix HT</th>
                <th className="p-3 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {(priceInfo.modules ?? []).map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-3">
                    <b>{m.name}</b><br/>
                    <span className="text-xs text-gray-500">{m.desc}</span>
                  </td>
                  <td className="p-3">{docMeta.periode}</td>
                  <td className="p-3 text-center">1</td>
                  <td className="p-3 text-right">{m.unitPrice.toFixed(2)} €</td>
                  <td className="p-3 text-right">{m.unitPrice.toFixed(2)} €</td>
                </tr>
              ))}
              {(priceInfo.volumePercent ?? 0) > 0 && (
                <>
                  <tr className="border-b text-xs">
                    <td colSpan={4} className="p-3 text-right text-gray-600">Sous-total HT</td>
                    <td className="p-3 text-right">{(priceInfo.subtotal ?? priceInfo.monthly).toFixed(2)} €</td>
                  </tr>
                  <tr className="border-b text-xs text-emerald-700">
                    <td colSpan={4} className="p-3 text-right">Remise volume — {priceInfo.modules?.length} modules ({priceInfo.volumePercent} %)</td>
                    <td className="p-3 text-right">− {(priceInfo.volumeAmount ?? 0).toFixed(2)} €</td>
                  </tr>
                </>
              )}
              <tr className="border-b">
                <td colSpan={4} className="p-3 text-right font-bold">Total HT</td>
                <td className="p-3 text-right font-bold">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              <tr className="border-b">
                <td colSpan={4} className="p-3 text-right text-xs text-gray-600">{vendor.tvaIntracom ? `TVA 20 % (N° ${vendor.tvaIntracom})` : "TVA non applicable — art. 293B du CGI"}</td>
                <td className="p-3 text-right text-xs text-gray-600">{vendor.tvaIntracom ? `${(priceInfo.monthly * 0.2).toFixed(2)} €` : "— €"}</td>
              </tr>
              <tr className="bg-gray-50 font-black">
                <td colSpan={4} className="p-3 text-right">Total TTC</td>
                <td className="p-3 text-right text-orange-500">{vendor.tvaIntracom ? (priceInfo.monthly * 1.2).toFixed(2) : priceInfo.monthly.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-orange-50/60 border-2 border-orange-500 rounded-xl p-6 flex justify-between items-end mb-6">
            <div>
              <div className="font-black text-lg text-gray-900">Net à payer</div>
              <div className="text-xs text-gray-600">Échéance : <b className="text-gray-900">{docMeta.echeance}</b></div>
              <div className="text-xs text-gray-600 mt-1">Mode : virement bancaire</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-orange-600">{priceInfo.monthly.toFixed(2)} €</div>
              <div className="text-xs text-gray-600">Sans TVA</div>
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
                SIRET : {PH(vendor.siret, "10511115700019")}<br/>
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
          <p className="text-sm mb-4 leading-relaxed">Mise à disposition de la plateforme SaaS <b>MaTable.Pro</b> sur les modules sélectionnés ci-dessous. Hébergement, mises à jour et support inclus.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Détail tarifaire — engagement <span className="text-orange-700">{priceInfo.durationLabel ?? engagement}</span></h2>
          <table className="w-full text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-900 text-left text-xs uppercase tracking-wider border-y-2 border-orange-500">
                <th className="p-3">Module</th>
                <th className="p-3 text-right">Prix HT / mois</th>
              </tr>
            </thead>
            <tbody>
              {(priceInfo.modules ?? []).map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-3"><b>{m.name}</b>{m.required && <span className="text-xs italic text-orange-600"> · requis</span>}<br/><span className="text-xs text-gray-500">{m.desc}</span></td>
                  <td className="p-3 text-right">{m.unitPrice.toFixed(2)} €</td>
                </tr>
              ))}
              <tr className="border-b text-xs">
                <td className="p-3 text-right text-gray-600">Sous-total HT mensuel ({priceInfo.modules?.length ?? 0} module{(priceInfo.modules?.length ?? 0) > 1 ? "s" : ""})</td>
                <td className="p-3 text-right">{(priceInfo.subtotal ?? priceInfo.monthly).toFixed(2)} €</td>
              </tr>
              {(priceInfo.volumePercent ?? 0) > 0 && (
                <tr className="border-b text-xs text-emerald-700">
                  <td className="p-3 text-right">Remise volume ({priceInfo.volumePercent} %)</td>
                  <td className="p-3 text-right">− {(priceInfo.volumeAmount ?? 0).toFixed(2)} €</td>
                </tr>
              )}
              {priceInfo.durationKey && priceInfo.durationKey !== "3m" && (
                <tr className="border-b text-xs text-emerald-700 italic">
                  <td className="p-3 text-right">Réduction engagement {priceInfo.durationLabel} (vs prix de base 3 mois)</td>
                  <td className="p-3 text-right font-bold">{priceInfo.mult}</td>
                </tr>
              )}
              <tr className="bg-gray-50 font-black">
                <td className="p-3 text-right">Mensualité HT à régler</td>
                <td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
              <tr className="bg-orange-50/50 text-sm">
                <td className="p-3 text-right text-orange-900">Total HT sur la période d'engagement</td>
                <td className="p-3 text-right font-black text-orange-700">{priceInfo.total.toFixed(2)} €</td>
              </tr>
              {priceInfo.isAnnualPay && (
                <tr className="border-t-2 border-orange-500 text-sm">
                  <td className="p-3 text-right text-orange-700">→ À régler en une fois à la signature (paiement annuel)</td>
                  <td className="p-3 text-right font-black text-orange-700">{(priceInfo.annualPayTotal ?? priceInfo.monthly * 12).toFixed(2)} €</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-4">{vendor.tvaIntracom ? `TVA 20 % applicable — N° ${vendor.tvaIntracom}. Montant TTC = HT × 1,20.` : "TVA non applicable, art. 293B du CGI."}</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Conditions</h2>
          <ul className="text-sm mb-4 ml-6 list-disc space-y-1">
            <li>Devis valable jusqu'au <b>{docMeta.validite}</b>.</li>
            <li>Tarifs exprimés en euros hors taxes. {vendor.tvaIntracom ? `TVA 20 % en sus (N° ${vendor.tvaIntracom}).` : "TVA non applicable, art. 293B du CGI."}</li>
            <li><b>Prix de base = engagement 3 mois.</b> Réductions appliquées sur engagement plus long : <b className="text-emerald-700">6 m (−2 %) · 9 m (−4 %) · 12 m (−7 %) · 12 m annuel (−12 %)</b>.</li>
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

      {/* ===== DEVIS CHAÎNE — multi-établissements, lignes saisies à la main ===== */}
      {docType === "devis-chaine" && (() => {
        const cq = chainQuote ?? { establishments: [], groupDiscountPercent: 0, setupFeeHt: 0 };
        const subtotalMonthly = cq.establishments.reduce((s, e) => s + (e.monthlyHt || 0), 0);
        const groupDiscount = subtotalMonthly * (cq.groupDiscountPercent / 100);
        const totalMonthly = subtotalMonthly - groupDiscount;
        const moduleNames: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.id, m.name]));
        const engLabel: Record<string, string> = { "3m": "3 m", "6m": "6 m", "9m": "9 m", "12m": "12 m", "12a": "12 m an." };
        return (
          <div>
            {/* Émetteur / Bénéficiaire */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border">
                <h3 className="text-xs uppercase tracking-widest text-orange-500 font-black mb-3">Émetteur</h3>
                <p className="text-sm font-bold mb-1">{vendor.raisonSociale}</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {vendor.address}<br/>
                  SIRET : {PH(vendor.siret, "10511115700019")}<br/>
                  {vendor.email} · {vendor.phone}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-3">Groupe / Chaîne</h3>
                <p className="text-sm font-bold mb-1">{clientData.name || "..."}</p>
                <p className="text-xs text-orange-900 leading-relaxed">
                  {clientData.address || "..."}<br/>
                  {clientData.managerName && <>Contact : {clientData.managerName}<br/></>}
                  {clientData.email && <>{clientData.email}</>}
                </p>
              </div>
            </div>

            <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Périmètre du devis</h2>
            <p className="text-sm mb-4 leading-relaxed">
              Le présent devis couvre <b>{cq.establishments.length}</b> établissement{cq.establishments.length > 1 ? "s" : ""} du
              groupe <b>{clientData.name || "Client"}</b> avec un tarif négocié au cas par cas selon les modules retenus et la durée d'engagement.
            </p>

            <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Détail par établissement</h2>
            <table className="w-full text-xs mb-3 border-collapse">
              <thead>
                <tr className="bg-orange-50 text-orange-900 text-left uppercase tracking-wider border-y-2 border-orange-500">
                  <th className="p-2">#</th>
                  <th className="p-2">Établissement</th>
                  <th className="p-2">Modules retenus</th>
                  <th className="p-2 text-center">Eng.</th>
                  <th className="p-2 text-right">HT/mois</th>
                </tr>
              </thead>
              <tbody>
                {cq.establishments.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-400 italic text-xs">Aucun établissement saisi — éditez le devis dans le sidebar.</td></tr>
                ) : cq.establishments.map((e, i) => (
                  <tr key={e.id} className="border-b border-gray-200">
                    <td className="p-2 font-mono text-gray-500">{i + 1}</td>
                    <td className="p-2">
                      <b>{e.name || "—"}</b>
                      {e.city && <><br/><span className="text-[10px] text-gray-500">{e.city}</span></>}
                      {e.notes && <><br/><span className="text-[10px] text-gray-500 italic">{e.notes}</span></>}
                    </td>
                    <td className="p-2 text-xs">
                      {e.modules.length === 0 ? <span className="text-gray-400">—</span> : e.modules.map((mid) => moduleNames[mid] ?? mid).join(" · ")}
                    </td>
                    <td className="p-2 text-center text-xs">{engLabel[e.engagement] ?? e.engagement}</td>
                    <td className="p-2 text-right font-bold">{(e.monthlyHt || 0).toFixed(2)} €</td>
                  </tr>
                ))}
                <tr className="border-b text-xs">
                  <td colSpan={4} className="p-2 text-right text-gray-600">Sous-total HT mensuel ({cq.establishments.length} établissement{cq.establishments.length > 1 ? "s" : ""})</td>
                  <td className="p-2 text-right">{subtotalMonthly.toFixed(2)} €</td>
                </tr>
                {cq.groupDiscountPercent > 0 && (
                  <tr className="border-b text-xs text-emerald-700">
                    <td colSpan={4} className="p-2 text-right">Remise groupe ({cq.groupDiscountPercent} %)</td>
                    <td className="p-2 text-right">− {groupDiscount.toFixed(2)} €</td>
                  </tr>
                )}
                <tr className="bg-gray-50 font-black">
                  <td colSpan={4} className="p-2 text-right">TOTAL HT MENSUEL</td>
                  <td className="p-2 text-right text-orange-500">{totalMonthly.toFixed(2)} €</td>
                </tr>
                <tr className="bg-orange-50/40 text-sm">
                  <td colSpan={4} className="p-2 text-right text-orange-900">Total HT annuel (×12)</td>
                  <td className="p-2 text-right font-black text-orange-700">{(totalMonthly * 12).toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>

            {cq.setupFeeHt > 0 && (
              <div className="bg-gray-50 border rounded-lg p-3 mb-3 text-sm">
                <div className="flex justify-between">
                  <span><b>Frais d'installation groupe</b> <span className="text-xs text-gray-500">(facturation unique à la signature)</span></span>
                  <b>{cq.setupFeeHt.toFixed(2)} € HT</b>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 italic mb-4">{vendor.tvaIntracom ? `TVA 20 % applicable — N° ${vendor.tvaIntracom}.` : "TVA non applicable, art. 293B du CGI."}</p>

            <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Conditions</h2>
            <ul className="text-sm mb-4 ml-6 list-disc space-y-1">
              <li>Devis valable jusqu'au <b>{docMeta.validite}</b>.</li>
              <li>Paiement mensuel par virement bancaire ou prélèvement SEPA — un seul prélèvement consolidé pour l'ensemble du groupe.</li>
              <li>Contrat-cadre Groupe + bons de commande individuels par établissement à la signature.</li>
              <li>Mise en service échelonnée selon planning à arrêter conjointement après acceptation du devis.</li>
              <li>Account Manager dédié + ligne directe pour l'ensemble des établissements du groupe.</li>
              {cq.notes && <li className="italic">{cq.notes}</li>}
            </ul>

            <div className="grid grid-cols-2 gap-8 mt-10">
              <div className="border rounded-xl p-4">
                <h3 className="text-xs uppercase tracking-widest text-gray-400 font-black mb-2">Émetteur</h3>
                <div className="border-b h-14 mb-2"></div>
                <p className="text-xs text-gray-500">{vendor.representant} — {docMeta.date}</p>
              </div>
              <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
                <h3 className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Bon pour accord — Groupe</h3>
                <p className="text-xs text-orange-700 mb-2">Mention manuscrite « bon pour accord » + signature + cachet</p>
                <div className="border-b border-orange-200 h-14 mb-2"></div>
                <p className="text-xs text-orange-900">{clientData.managerName || "..."}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== CGV / CGU ===== */}
      {docType === "cgvu" && (
        <div className="text-sm leading-relaxed">
          <p className="text-xs text-gray-500 mb-6 italic">En vigueur au {docMeta.date}. Applicables à toute souscription d'un abonnement à la plateforme MaTable.Pro.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 1 — Identification du Prestataire</h2>
          <p className="mb-3">La plateforme MaTable.Pro (« <b>la Plateforme</b> ») est éditée et exploitée par :</p>
          <ul className="ml-6 mb-3 list-disc">
            <li><b>{vendor.raisonSociale}</b> {vendor.formeJuridique && <>— {vendor.formeJuridique}</>}</li>
            <li>Siège social : {vendor.address}</li>
            <li>SIRET : {PH(vendor.siret, "10511115700019")}</li>
            {vendor.rcs && <li>RCS : {vendor.rcs}</li>}
            {vendor.codeAPE && <li>Code APE : {vendor.codeAPE}</li>}
            <li>TVA intracommunautaire : {vendor.tvaIntracom || "Non assujetti (art. 293B du CGI)"}</li>
            {vendor.rcs && <li>Greffe : {vendor.rcs}</li>}
            <li>Email : {vendor.email} · Téléphone : {vendor.phone}</li>
            <li>Directeur de la publication : {vendor.representant}</li>
            <li>Hébergeur : Railway Corp., 251 Little Falls Drive, Wilmington, DE 19808, États-Unis — infrastructure et base de données déployées sur la région européenne (Frankfurt, Allemagne)</li>
            <li>Code source versionné sur GitHub Inc. (Microsoft Corp.) — accès restreint</li>
            <li><b>Partenaire technique IA</b> : <b>NovaTech</b> — fournisseur des modèles d'intelligence artificielle, de leur infrastructure d'exécution et du savoir-faire associé pour les fonctionnalités Nova IA, Magic Scan, descriptions assistées, chatbot et finance IA</li>
          </ul>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 2 — Objet</h2>
          <p className="mb-3">Les présentes CGV/CGU régissent l'accès et l'utilisation de la Plateforme MaTable.Pro, service en ligne (SaaS) à destination des établissements de restauration et assimilés (restaurants, bars, salons de thé, boutiques alimentaires). La Plateforme propose notamment : gestion d'avis Google, QR codes de commande à table, portail serveur, écran cuisine, caisse, assistant IA (Nova), gestion de stock, réservations en ligne.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 3 — Acceptation</h2>
          <p className="mb-3">Toute souscription à un abonnement implique l'acceptation pleine et entière des présentes CGV/CGU. Le Client reconnaît avoir la capacité juridique de contracter, agir en tant que professionnel et avoir pris connaissance des présentes avant signature du contrat d'abonnement.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 4 — Description des services</h2>
          <p className="mb-2">L'abonnement MaTable.Pro comprend l'accès illimité à l'ensemble des modules suivants pour un établissement :</p>
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
          <p className="mb-2">Tarifs en vigueur, hors taxes. {vendor.tvaIntracom ? `TVA 20 % en sus (N° ${vendor.tvaIntracom}).` : "TVA non applicable, art. 293B du CGI."} <b>Le prix de base s'entend pour un engagement de 3 mois</b>, et une réduction est appliquée pour tout engagement plus long :</p>
          <table className="w-full text-xs mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Engagement</th>
                <th className="p-2 text-right">Mensualité HT (Avis seul)</th>
                <th className="p-2 text-right">Total période HT</th>
                <th className="p-2 text-right">Réduction</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-gray-50"><td className="p-2"><b>3 mois — prix de base</b></td><td className="p-2 text-right"><b>84,53 €</b></td><td className="p-2 text-right"><b>253,59 €</b></td><td className="p-2 text-right">—</td></tr>
              <tr className="border-b"><td className="p-2">6 mois</td><td className="p-2 text-right">82,95 €</td><td className="p-2 text-right">497,70 €</td><td className="p-2 text-right text-emerald-700">−2 %</td></tr>
              <tr className="border-b"><td className="p-2">9 mois</td><td className="p-2 text-right">81,37 €</td><td className="p-2 text-right">732,33 €</td><td className="p-2 text-right text-emerald-700">−4 %</td></tr>
              <tr className="border-b bg-orange-50"><td className="p-2"><b>12 mois — recommandé</b></td><td className="p-2 text-right"><b>79,00 €</b></td><td className="p-2 text-right"><b>948,00 €</b></td><td className="p-2 text-right text-emerald-700 font-bold">−7 %</td></tr>
              <tr className="border-b"><td className="p-2">12 mois — paiement annuel</td><td className="p-2 text-right">75,05 €</td><td className="p-2 text-right">900,60 €</td><td className="p-2 text-right text-emerald-700 font-bold">−12 %</td></tr>
            </tbody>
          </table>
          <p className="mb-3">L'engagement choisi est ferme. À son terme, le Contrat se renouvelle <b>tacitement par périodes successives d'un mois</b> au tarif équivalent 12 mois, sauf résiliation notifiée 30 jours avant l'échéance par email avec accusé de réception.</p>

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
          <p className="mb-3">L'ensemble des éléments composant la Plateforme (code, design, marque « MaTable.Pro », interfaces, contenus éditoriaux, IA, base de données) est la propriété exclusive du Prestataire et protégé par le droit d'auteur et le droit des marques. Le Client bénéficie d'un droit d'usage personnel, non-exclusif et non-transférable pendant la durée du Contrat. Les <b>données saisies par le Client</b> (menu, clients finaux, commandes, avis) demeurent sa propriété exclusive.</p>

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
          <p className="mb-3">Tout différend fera l'objet d'une tentative de résolution amiable préalable par échange écrit. À défaut d'accord dans un délai de 30 jours, le litige sera soumis au <b>Tribunal de Commerce de Créteil</b> (RCS Créteil — SIRET {vendor.siret || "10511115700019"}). Le présent contrat est soumis au droit français.</p>

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
                <p className="text-gray-500">N° SIRET : <span className="text-black font-bold">{PH(vendor.siret, "10511115700019")}</span></p>
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
          <p className="text-sm mb-3 leading-relaxed">Cette prestation comprend l'accès à la plateforme MaTable.Pro et à l'ensemble de ses modules : Avis Google, QR Commande, Portail Serveur, Cuisine Live, Caisse, Nova IA, Stock IA, Réservations. L'accompagnement technique (formation, mise en service, support) est inclus.</p>

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
              <tr className="bg-orange-50 text-orange-900 text-left text-xs uppercase tracking-wider border-y-2 border-orange-500">
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
          <p className="text-xs text-gray-500 italic mb-3">{vendor.tvaIntracom ? `TVA 20 % applicable — N° TVA intracommunautaire : ${vendor.tvaIntracom}. Montant TTC = HT × 1,20.` : "TVA non applicable, art. 293B du CGI."}</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 4 — Limite raisonnable d'utilisation de l'IA</h2>
          <p className="text-sm mb-3 leading-relaxed">
            L'accès aux fonctionnalités IA (Nova IA, Magic Scan, descriptions, chatbot, finance assistée) est
            fourni dans la limite d'un <b>usage professionnel raisonnable</b>. Au-delà d'un seuil correspondant
            à <b>deux fois la moyenne d'utilisation</b> constatée chez les clients comparables, le service IA pourra être
            <b> temporairement restreint</b>. Une extension de quota est possible sur devis préalable auprès du Prestataire.
          </p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 5 — Propriété intellectuelle</h2>
          <p className="text-sm mb-3 leading-relaxed">La plateforme MaTable.Pro et ses composants restent la propriété exclusive du Prestataire. Le Bénéficiaire ne dispose que d'un droit d'usage temporaire pendant la durée de la prestation. Les <b>données saisies par le Bénéficiaire</b> (menu, clients, avis, commandes) restent sa pleine propriété.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 6 — Obligations du Bénéficiaire</h2>
          <p className="text-sm mb-3 leading-relaxed">Le Bénéficiaire fournit tous les éléments nécessaires à la mise en service (menu, photos, coordonnées Google Business, etc.). Il conserve la confidentialité de ses identifiants et codes PIN. Il s'engage à un usage conforme à l'objet de la prestation.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 7 — Données personnelles (RGPD)</h2>
          <p className="text-sm mb-3 leading-relaxed">Le Prestataire agit en qualité de sous-traitant au sens de l'art. 28 du RGPD pour les données personnelles confiées par le Bénéficiaire. Les données sont hébergées dans l'Union Européenne (Railway, région Frankfurt) et chiffrées. À la fin de la prestation, elles sont restituées au Bénéficiaire ou détruites sur demande sous 30 jours.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 8 — Force majeure</h2>
          <p className="text-sm mb-3 leading-relaxed">Aucune Partie ne saurait être tenue responsable d'un manquement résultant d'un cas de force majeure au sens de l'art. 1218 du Code civil.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 9 — Résiliation</h2>
          <p className="text-sm mb-3 leading-relaxed">Outre la résiliation pour convenance (art. 2 — préavis 15 jours), chaque Partie peut résilier à effet immédiat en cas de manquement grave de l'autre, 15 jours après mise en demeure restée infructueuse. Les sommes déjà versées restent acquises au Prestataire à concurrence des prestations effectivement réalisées.</p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 10 — Évolution vers un Contrat d'Abonnement</h2>
          <p className="text-sm mb-3 leading-relaxed">
            Les Parties peuvent à tout moment convenir de formaliser leur relation dans le cadre d'un <b>Contrat d'Abonnement</b> standard MaTable.Pro, qui remplacera et complétera le présent contrat de prestation. Les sommes déjà versées pourront, le cas échéant, être imputées sur la première mensualité du nouvel abonnement. Le Bénéficiaire reste libre de ne pas souscrire (sans pénalité), auquel cas la prestation prend fin à la fin de la période mensuelle en cours.
          </p>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-2">Article 11 — Loi applicable & juridiction</h2>
          <p className="text-sm mb-6 leading-relaxed">Le présent Contrat est soumis au droit français. Tout différend non résolu à l'amiable dans un délai de 30 jours sera porté devant le Tribunal de Commerce de Créteil, compétent au titre du siège social du Prestataire (RCS Créteil — {vendor.siret || "SIRET 10511115700019"}).</p>

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
                <p className="text-orange-900">Engagement : <b>{priceInfo.durationLabel ?? engagement}</b></p>
                <p className="text-orange-900">Modules : <b>{priceInfo.modules?.length ?? 1}</b></p>
                <p className="text-orange-900">Mensualité HT : <b>{priceInfo.monthly.toFixed(2)} €</b></p>
                <p className="text-orange-900">Total période : <b>{priceInfo.total.toFixed(2)} €</b></p>
                {(priceInfo.volumePercent ?? 0) > 0 && (
                  <p className="text-orange-900 text-xs">Remise volume : <b>{priceInfo.volumePercent} %</b></p>
                )}
                <p className="text-orange-900 text-xs italic">Maj. engagement : {priceInfo.mult}</p>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 border-t pt-4 mb-3">Modules souscrits par ce client</h2>
          <table className="w-full text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-900 text-left text-xs uppercase tracking-wider border-y-2 border-orange-500">
                <th className="p-3">Module</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-right">Prix HT/mois</th>
              </tr>
            </thead>
            <tbody>
              {/* Affiche TOUS les modules de la grille pour montrer l'état complet du client */}
              {MODULES.map((mod) => {
                const subscribed = priceInfo.modules?.find((m) => m.id === mod.id);
                return (
                  <tr key={mod.id} className="border-b">
                    <td className="p-3">
                      <b>{mod.name}</b>{mod.required && <span className="text-xs italic text-orange-600"> · requis</span>}<br/>
                      <span className="text-xs text-gray-500">{mod.desc}</span>
                    </td>
                    <td className={`p-3 text-center ${subscribed ? "text-emerald-600 font-bold" : "text-gray-400"}`}>
                      {subscribed ? "✓ Actif" : "— Inactif"}
                    </td>
                    <td className="p-3 text-right">
                      {subscribed ? `${subscribed.unitPrice.toFixed(2)} €` : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
              {(priceInfo.volumePercent ?? 0) > 0 && (
                <tr className="border-b text-xs text-emerald-700">
                  <td colSpan={2} className="p-3 text-right">Remise volume ({priceInfo.modules?.length} modules · {priceInfo.volumePercent} %)</td>
                  <td className="p-3 text-right">− {(priceInfo.volumeAmount ?? 0).toFixed(2)} €</td>
                </tr>
              )}
              <tr className="bg-orange-50 font-black">
                <td colSpan={2} className="p-3 text-right">TOTAL HT MENSUEL</td>
                <td className="p-3 text-right text-orange-500">{priceInfo.monthly.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic mb-4">
            Engagement actuel : <b>{priceInfo.durationLabel ?? engagement}</b> · Multiplicateur durée : ×{priceInfo.realMult?.toFixed(2) ?? "1.00"}.
            Pour modifier les modules ou la durée d'engagement, contactez votre Account Manager.
          </p>

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

      {/* ===== PLAQUETTE COMMERCIALE (à laisser au prospect) ===== */}
      {docType === "plaquette" && (
        <div>
          {/* Hero — personnalisé au prospect */}
          <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-500 rounded-2xl p-6 mb-6">
            <p className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Préparé pour</p>
            <p className="text-2xl font-black text-gray-900">{clientData.name || "Votre établissement"}</p>
            {clientData.managerName && (
              <p className="text-sm text-gray-600 mt-1">À l'attention de <b className="text-gray-900">{clientData.managerName}</b></p>
            )}
            <h1 className="text-3xl font-black mt-5 leading-tight">
              Triplez vos avis Google<br/>
              <span className="text-orange-500">sans effort de votre équipe.</span>
            </h1>
          </div>

          {/* Le problème */}
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-2">Le constat</h2>
          <p className="text-sm leading-relaxed mb-5">
            <b>70 % des clients satisfaits</b> ne laissent jamais d'avis Google. Pas par mauvaise volonté —
            par <b>oubli</b>, parce qu'ils sont occupés, parce que demander un avis met votre équipe mal à l'aise.
            Conséquence : votre note Google ne reflète pas votre vraie qualité, et vous passez à côté de
            <b> 30 % de clients potentiels</b> qui choisissent un autre restaurant simplement parce que sa note est plus élevée.
          </p>

          {/* La solution */}
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-2">Notre solution — MaTable.Pro</h2>
          <p className="text-sm leading-relaxed mb-5">
            Vos clients scannent un QR code sur leur table, commandent et payent quand ils veulent.
            <b> Nova IA</b>, notre assistante intelligente, leur propose à la fin du repas de partager leur expérience
            en 30 secondes — <b>directement publié sur Google Business</b>. Votre équipe ne fait rien : tout est automatique.
          </p>

          {/* 4 modules clés sous forme de cartes */}
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-3">Ce qui est inclus dans votre abonnement</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">⭐</div>
              <p className="font-black text-sm">Avis Google automatisés</p>
              <p className="text-xs text-gray-600">Nova IA récolte et publie les avis à votre place</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">📱</div>
              <p className="font-black text-sm">QR Codes & commande à table</p>
              <p className="text-xs text-gray-600">Vos clients commandent et payent depuis leur téléphone</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">👨‍🍳</div>
              <p className="font-black text-sm">Cuisine & Caisse intégrées</p>
              <p className="text-xs text-gray-600">Écran cuisine temps réel + caisse session avec pourboires</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">🤖</div>
              <p className="font-black text-sm">Nova IA complète</p>
              <p className="text-xs text-gray-600">Magic Scan menu, descriptions, planning, finance</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">📦</div>
              <p className="font-black text-sm">Gestion de stock IA</p>
              <p className="text-xs text-gray-600">Alertes ruptures + prédictions intelligentes</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">📅</div>
              <p className="font-black text-sm">Réservations en ligne</p>
              <p className="text-xs text-gray-600">Acompte Stripe + politique d'annulation</p>
            </div>
          </div>

          {/* Grille tarifaire — modules à la carte */}
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-1">Tarifs à la carte — modules HT/mois</h2>
          <p className="text-xs text-gray-500 italic mb-3">Tarifs de base, engagement 3 mois. Réductions appliquées sur les engagements plus longs (voir ci-dessous).</p>
          <table className="w-full text-xs mb-3 border-collapse">
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id} className="border-b border-gray-200">
                  <td className="py-1.5"><b>{m.name}</b>{m.required && <span className="text-orange-600 italic"> · requis</span>}</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">{(m.price * 1.07).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-orange-50/60 border-2 border-orange-500 rounded-xl p-4 mb-6 text-sm">
            <p className="font-black text-orange-600 mb-2">💡 Cumulez les modules pour des remises supplémentaires :</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
              <div><b className="text-emerald-600">−10 %</b> dès 2 modules</div>
              <div><b className="text-emerald-600">−15 %</b> dès 3 modules</div>
              <div><b className="text-emerald-600">−20 %</b> dès 4 modules</div>
            </div>
            <p className="text-xs text-gray-700 mt-3 pt-3 border-t border-orange-200">
              <b className="text-orange-600">Plus l'engagement est long, plus la réduction est forte :</b><br/>
              3 mois (prix de base) · 6 mois (<b className="text-emerald-700">−2 %</b>) · 9 mois (<b className="text-emerald-700">−4 %</b>) · <b>12 mois (<span className="text-emerald-700">−7 %</span>)</b> · 12 mois en paiement annuel (<b className="text-emerald-700">−12 %</b>)
            </p>
          </div>

          {/* CTA */}
          <div className="border-2 border-dashed border-orange-400 rounded-xl p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Démo gratuite — 15 minutes</p>
            <p className="text-sm mb-3">Sur place ou en visio. Sans engagement. Mise en service sous 7 jours.</p>
            <p className="text-lg font-black text-gray-900">
              📞 {vendor.phone}
            </p>
            <p className="text-sm text-orange-600 font-bold">
              ✉ {vendor.email}
            </p>
            <p className="text-xs text-gray-500 italic mt-2">
              Demandez <b className="not-italic text-gray-900">{vendor.representant}</b> — Réf. {docMeta.numero}
            </p>
          </div>

          <p className="text-xs text-gray-500 italic text-center mt-4">
            {vendor.raisonSociale} {vendor.formeJuridique && `· ${vendor.formeJuridique}`} · matable.pro
          </p>
        </div>
      )}

      {/* ===== PLAQUETTE ÉCO — minimaliste, économe en encre ===== */}
      {docType === "plaquette-eco" && (
        <div>
          {/* Hero ultra-épuré : tout en typo, fond blanc */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500 font-black">Préparé pour</p>
            <p className="text-xl font-black text-gray-900 mt-1">{clientData.name || "Votre établissement"}</p>
            {clientData.managerName && (
              <p className="text-sm text-gray-500 mt-0.5">À l'attention de <b className="text-gray-700">{clientData.managerName}</b></p>
            )}
          </div>

          <h1 className="text-4xl font-black leading-[1.05] mb-6">
            Triplez vos avis Google.<br/>
            <span className="text-orange-500">Sans effort.</span>
          </h1>

          <div className="h-px bg-gray-300 mb-6" />

          {/* 3 chiffres clés en typo, pas de fond */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div>
              <p className="text-4xl font-black text-gray-900">+200<span className="text-orange-500">%</span></p>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">Avis Google</p>
            </div>
            <div>
              <p className="text-4xl font-black text-gray-900">+30<span className="text-orange-500">%</span></p>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">Service plus rapide</p>
            </div>
            <div>
              <p className="text-4xl font-black text-gray-900">+15<span className="text-orange-500">%</span></p>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">Pourboires</p>
            </div>
          </div>

          <div className="h-px bg-gray-300 mb-6" />

          {/* Le constat (texte fluide, économe) */}
          <p className="text-sm leading-relaxed mb-6 text-gray-700">
            <b className="text-gray-900">70 % de vos clients satisfaits</b> ne laissent jamais d'avis Google — par oubli.
            Nova IA leur propose à la fin du repas de partager leur expérience en 30 secondes, directement publié.
            Votre équipe ne fait <b>rien de plus</b> : tout est automatique.
          </p>

          {/* Modules disponibles — liste avec prix de base 3 mois */}
          <p className="text-xs uppercase tracking-widest text-orange-500 font-black mb-1">Modules à la carte — tarifs HT/mois</p>
          <p className="text-[10px] text-gray-500 italic mb-2">Prix de base (engagement 3 mois). Réductions appliquées pour engagements plus longs.</p>
          <table className="w-full text-sm mb-4">
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id} className="border-b border-gray-200">
                  <td className="py-1.5"><span className="text-orange-500 font-black">›</span> <b>{m.name}</b>{m.required && <span className="text-orange-600 italic text-xs"> · requis</span>}</td>
                  <td className="py-1.5 text-right font-bold">{(m.price * 1.07).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-gray-700 mb-2 leading-relaxed">
            <b className="text-orange-600">Cumulez plusieurs modules :</b> <b className="text-emerald-700">−10 %</b> dès 2 · <b className="text-emerald-700">−15 %</b> dès 3 · <b className="text-emerald-700">−20 %</b> dès 4.
          </p>
          <p className="text-xs text-gray-700 mb-6 leading-relaxed">
            <b className="text-orange-600">Réduction engagement :</b> 3 m (prix de base) · 6 m (<b className="text-emerald-700">−2 %</b>) · 9 m (<b className="text-emerald-700">−4 %</b>) · 12 m (<b className="text-emerald-700">−7 %</b>) · 12 m annuel (<b className="text-emerald-700">−12 %</b>).
          </p>

          <div className="h-px bg-gray-300 mb-6" />

          {/* Prix d'entrée + tarif tout activé */}
          <div className="mb-8 text-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-gray-700">Configuration minimale (Avis Google seul, 3 m)</p>
              <p className="text-2xl font-black text-orange-500">84,53 € HT/mois</p>
            </div>
            <div className="flex items-baseline justify-between mt-1 text-xs text-gray-500">
              <p>Pack complet 7 modules (−20 % volume, 12 m)</p>
              <p className="font-bold">482,40 € HT/mois</p>
            </div>
          </div>

          {/* CTA — SEULE zone colorée du doc */}
          <div className="border-2 border-orange-500 rounded-xl p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-orange-600 font-bold mb-1">Démo gratuite · 15 min · sans engagement</p>
            <p className="text-2xl font-black text-gray-900 mt-2">📞 {vendor.phone}</p>
            <p className="text-sm text-orange-600 font-bold mt-1">{vendor.email}</p>
            <p className="text-xs text-gray-500 italic mt-2">Demandez <b className="not-italic text-gray-900">{vendor.representant}</b> · Réf. {docMeta.numero}</p>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-4">
            {vendor.raisonSociale} · matable.pro
          </p>
        </div>
      )}

      {/* ===== PLAQUETTE PREMIUM — pour gros prospects ===== */}
      {docType === "plaquette-premium" && (
        <div>
          {/* Hero avec liseré couleur */}
          <div className="border-l-4 border-orange-500 pl-4 mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-600 font-black mb-1">Proposition personnalisée pour</p>
            <p className="text-3xl font-black text-gray-900">{clientData.name || "Votre établissement"}</p>
            {clientData.managerName && (
              <p className="text-sm text-gray-600 mt-1">À l'attention de <b className="text-gray-900">{clientData.managerName}</b> · Établie le {docMeta.date}</p>
            )}
          </div>

          <h1 className="text-3xl font-black leading-tight mb-4">
            La plateforme tout-en-un<br/>
            <span className="text-orange-500">pour les restaurateurs ambitieux.</span>
          </h1>

          <p className="text-sm leading-relaxed text-gray-700 mb-6">
            MaTable.Pro digitalise <b>l'intégralité de votre exploitation</b> — de la prise de commande aux avis Google,
            en passant par la caisse, le stock et la finance — dans une seule plateforme cohérente, opérée
            avec l'intelligence artificielle de <b className="text-gray-900">NovaTech</b>.
          </p>

          {/* Différenciants */}
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-3 border-t pt-4">Pourquoi MaTable.Pro plutôt qu'un autre</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-black text-sm text-gray-900 mb-1">🎯 Une seule plateforme</p>
              <p className="text-xs text-gray-600">Avis, caisse, cuisine, stock, finance — tout connecté. Pas de jonglage entre 5 outils.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-black text-sm text-gray-900 mb-1">🤖 IA professionnelle</p>
              <p className="text-xs text-gray-600">Modèles NovaTech entraînés sur la restauration. Pas un chatbot générique recyclé.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-black text-sm text-gray-900 mb-1">💶 Sans engagement caché</p>
              <p className="text-xs text-gray-600">Engagement libre 3 à 12 mois. Préavis 30 jours. Aucun frais d'installation.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-black text-sm text-gray-900 mb-1">🇫🇷 Souveraineté des données</p>
              <p className="text-xs text-gray-600">Hébergement UE (Frankfurt). Vos données restent votre propriété.</p>
            </div>
          </div>

          {/* Témoignages */}
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-3 border-t pt-4">Ils nous ont fait confiance</h2>
          <div className="space-y-3 mb-6">
            <blockquote className="bg-orange-50/40 border-l-4 border-orange-400 p-3 rounded-r">
              <p className="text-sm text-gray-800 italic leading-relaxed">
                « Nous étions à 4,2 sur Google. Trois mois plus tard, 4,7. Et surtout, nos clients commandent
                sans attendre — l'équipe de salle est libérée pour vraiment servir. »
              </p>
              <p className="text-xs text-gray-600 mt-2 font-bold">— Restaurant pilote, Pays de la Loire</p>
            </blockquote>
            <blockquote className="bg-orange-50/40 border-l-4 border-orange-400 p-3 rounded-r">
              <p className="text-sm text-gray-800 italic leading-relaxed">
                « Le Magic Scan a digitalisé notre carte en 10 minutes. Les descriptions IA sont meilleures
                que ce qu'on aurait écrit nous-mêmes. »
              </p>
              <p className="text-xs text-gray-600 mt-2 font-bold">— Bistrot urbain, Région Lyonnaise</p>
            </blockquote>
          </div>

          {/* Stack technique (rassurance) */}
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-3 border-t pt-4">Notre stack technique</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {["NovaTech (IA)", "Railway (UE)", "Stripe", "Resend", "GitHub", "TLS 1.3"].map((p) => (
              <span key={p} className="text-xs px-3 py-1 bg-gray-100 border border-gray-200 rounded-full font-bold text-gray-700">{p}</span>
            ))}
          </div>

          {/* Grille tarifaire complète + offres */}
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1 border-t pt-4">Grille tarifaire — sur-mesure modulaire</h2>
          <p className="text-[11px] text-gray-500 italic mb-2">Prix de base = engagement 3 mois. Plus l'engagement est long, plus la réduction est forte.</p>
          <table className="w-full text-xs mb-3 border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-900 border-y-2 border-orange-500">
                <th className="p-2 text-left">Module</th>
                <th className="p-2 text-right">HT/mois (3 m)</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id} className="border-b border-gray-200">
                  <td className="p-2"><b>{m.name}</b>{m.required && <span className="text-orange-600 italic text-[10px]"> · requis</span>}<br/><span className="text-[10px] text-gray-500">{m.desc.slice(0, 80)}…</span></td>
                  <td className="p-2 text-right font-bold">{(m.price * 1.07).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-orange-200 bg-orange-50/40 rounded-lg p-3">
              <p className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Remises volume modules</p>
              <ul className="text-xs space-y-1">
                <li>· 2 modules — <b className="text-emerald-700">−10 %</b></li>
                <li>· 3 modules — <b className="text-emerald-700">−15 %</b></li>
                <li>· 4 modules et + — <b className="text-emerald-700">−20 %</b></li>
              </ul>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-lg p-3">
              <p className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Réduction engagement</p>
              <ul className="text-xs space-y-1">
                <li>· 3 mois — prix de base</li>
                <li>· 6 mois — <b className="text-emerald-700">−2 %</b> · 9 mois — <b className="text-emerald-700">−4 %</b></li>
                <li>· <b>12 mois — <span className="text-emerald-700">−7 %</span></b> (recommandé)</li>
                <li>· 12 mois en paiement annuel — <b className="text-emerald-700">−12 %</b></li>
              </ul>
            </div>
          </div>

          <div className="bg-orange-50/60 border-2 border-orange-500 rounded-xl p-4 mb-4 text-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-xs uppercase tracking-widest text-orange-600 font-black">Exemples de configurations (12 mois)</p>
            </div>
            <div className="mt-2 space-y-1 text-xs text-gray-700">
              <div className="flex justify-between"><span>Avis Google seul (entrée de gamme)</span><b className="text-gray-900">79,00 € HT/mois</b></div>
              <div className="flex justify-between"><span>Avis + QR Commande (pack vitrine)</span><b className="text-gray-900">160,20 € HT/mois</b></div>
              <div className="flex justify-between"><span>Avis + QR + Serveur (pack salle)</span><b className="text-gray-900">209,95 € HT/mois</b></div>
              <div className="flex justify-between"><span>Pack complet 7 modules (−20 % volume)</span><b className="text-orange-600">482,40 € HT/mois</b></div>
            </div>
            <p className="text-[10px] text-gray-500 italic mt-2 pt-2 border-t border-orange-200">Configurations chiffrées sur engagement 12 mois. Mise en service sous 7 jours. Aucun frais d'installation.</p>
          </div>

          {/* CTA premium */}
          <div className="border-2 border-orange-500 bg-orange-50/30 rounded-xl p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Démo personnalisée — 30 minutes sur place</p>
            <p className="text-xl font-black text-gray-900">{vendor.representant}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">📞 {vendor.phone}</p>
            <p className="text-sm text-orange-600 font-bold">{vendor.email}</p>
            <p className="text-xs text-gray-500 italic mt-2">Réf. {docMeta.numero} · Cette proposition est valable jusqu'au {docMeta.validite}</p>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-4">
            {vendor.raisonSociale} {vendor.formeJuridique && `· ${vendor.formeJuridique}`} · {vendor.address} · matable.pro
          </p>
        </div>
      )}

      {/* ===== PLAQUETTE COMPACTE — A5 portrait (148×210 mm) pour porte-à-porte ===== */}
      {docType === "plaquette-compact" && (
        <div style={{ maxWidth: "148mm", margin: "0 auto", minHeight: "260mm" }}>
          {/* Format A5 portrait : utilise la moitié supérieure de l'A4 — l'autre moitié sera blanche ou pliée */}
          <div className="border-b-2 border-orange-500 pb-3 mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500 font-black">Préparé pour</p>
            <p className="text-xl font-black text-gray-900 mt-1">{clientData.name || "Votre établissement"}</p>
          </div>

          <h1 className="text-3xl font-black leading-[1.05] mb-3">
            Triplez vos avis Google.<br/>
            <span className="text-orange-500">Zéro effort.</span>
          </h1>

          <p className="text-xs leading-relaxed text-gray-700 mb-4">
            Vos clients scannent un QR sur leur table, commandent, payent.
            <b> Nova IA</b> récolte leur avis Google en 30 secondes. Tout est automatique.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="border border-orange-200 rounded p-2">
              <p className="text-lg font-black text-orange-500">+200%</p>
              <p className="text-[9px] uppercase text-gray-600">Avis Google</p>
            </div>
            <div className="border border-orange-200 rounded p-2">
              <p className="text-lg font-black text-orange-500">+30%</p>
              <p className="text-[9px] uppercase text-gray-600">Service</p>
            </div>
            <div className="border border-orange-200 rounded p-2">
              <p className="text-lg font-black text-orange-500">+15%</p>
              <p className="text-[9px] uppercase text-gray-600">Pourboires</p>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-wider text-orange-500 font-black mb-1">Modules à la carte — HT/mois (3 m)</p>
          <table className="w-full text-[10px] mb-3">
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id} className="border-b border-gray-200">
                  <td className="py-0.5"><b className="text-orange-500">›</b> {m.name}{m.required && <span className="text-orange-600 italic"> ·req.</span>}</td>
                  <td className="py-0.5 text-right font-bold">{(m.price * 1.07).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-[10px] text-gray-700 mb-3 leading-snug">
            <b>Cumulez modules :</b> <b className="text-emerald-700">−10 %</b> à <b className="text-emerald-700">−20 %</b>.<br/>
            <b>Engagement long :</b> <b className="text-emerald-700">−2 %</b> à <b className="text-emerald-700">−12 %</b> selon durée.
          </p>

          <div className="border-y border-gray-300 py-2 mb-4 text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-gray-700">Dès</span>
              <b className="text-xl text-orange-500">84,53 € HT/mois</b>
            </div>
            <div className="flex items-baseline justify-between text-[10px] text-gray-500">
              <span>Pack complet 7 mod. (12 m, −20 %)</span>
              <span>482,40 € HT/mois</span>
            </div>
          </div>

          <div className="border-2 border-orange-500 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-orange-600 font-bold mb-1">Démo gratuite — 15 min</p>
            <p className="text-base font-black">📞 {vendor.phone}</p>
            <p className="text-xs text-orange-600 font-bold">{vendor.email}</p>
            <p className="text-[10px] text-gray-500 italic mt-1">Demandez {vendor.representant}</p>
          </div>

          <p className="text-[8px] text-gray-400 text-center mt-3">
            {vendor.raisonSociale} · matable.pro · Réf. {docMeta.numero}
          </p>
        </div>
      )}

      {/* ===== PLAQUETTE CHAÎNE — multi-établissements, sur devis ===== */}
      {docType === "plaquette-chaine" && (
        <div>
          {/* Hero personnalisé groupe */}
          <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-500 rounded-2xl p-6 mb-6">
            <p className="text-xs uppercase tracking-widest text-orange-600 font-black mb-2">Proposition Groupe / Chaîne — préparée pour</p>
            <p className="text-2xl font-black text-gray-900">{clientData.name || "Votre groupe de restauration"}</p>
            {clientData.managerName && (
              <p className="text-sm text-gray-600 mt-1">À l'attention de <b className="text-gray-900">{clientData.managerName}</b></p>
            )}
            <h1 className="text-3xl font-black mt-5 leading-tight">
              Une plateforme unique<br/>
              <span className="text-orange-500">pour tous vos établissements.</span>
            </h1>
          </div>

          {/* Pitch */}
          <p className="text-sm leading-relaxed mb-5 text-gray-700">
            MaTable.Pro propose un <b>mode Chaîne dédié</b> aux groupes opérant plusieurs établissements.
            Chaque restaurant garde son autonomie opérationnelle (équipes, menu, caisse, tables) mais
            l'ensemble est piloté depuis un <b>dashboard central</b> avec carte interactive,
            statistiques consolidées et déploiement coordonné.
          </p>

          {/* Différenciants chaîne */}
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-3 border-t pt-4">Le mode Chaîne — Spécificités</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">🗺️</div>
              <p className="font-black text-sm">Carte interactive du groupe</p>
              <p className="text-xs text-gray-600">Tous vos établissements positionnés sur une carte unique, accessible publiquement à votre clientèle.</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">📊</div>
              <p className="font-black text-sm">Statistiques consolidées</p>
              <p className="text-xs text-gray-600">CA, avis Google, tickets moyens, top plats — tout le groupe en un coup d'œil.</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">🏷️</div>
              <p className="font-black text-sm">Identité de marque homogène</p>
              <p className="text-xs text-gray-600">Logo, charte, mentions légales, politique de confidentialité — appliqués automatiquement à toutes les fiches.</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">⚙️</div>
              <p className="font-black text-sm">Déploiement coordonné</p>
              <p className="text-xs text-gray-600">Ouverture d'un nouvel établissement : modules pré-configurés, équipes formées en 1 visio.</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">🤝</div>
              <p className="font-black text-sm">Account Manager dédié</p>
              <p className="text-xs text-gray-600">Un interlocuteur unique pour toute la chaîne, joignable en direct par téléphone et email prioritaire.</p>
            </div>
            <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3">
              <div className="text-2xl mb-1">📑</div>
              <p className="font-black text-sm">Contrat-cadre unique</p>
              <p className="text-xs text-gray-600">Un seul contrat groupe + bons de commande individuels par établissement.</p>
            </div>
          </div>

          {/* Modules — comme les restos individuels */}
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-3 border-t pt-4">Modules disponibles</h2>
          <p className="text-xs text-gray-600 mb-3">Les mêmes 7 modules que l'offre Restaurant individuel, activables au choix par établissement :</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-6">
            {MODULES.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-orange-500 font-black">›</span>
                <span><b>{m.name}</b>{m.required && <span className="text-orange-600 italic"> · requis</span>}</span>
              </div>
            ))}
          </div>

          {/* Tarification — SUR DEVIS, mise en avant */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 mb-4">
            <p className="text-xs uppercase tracking-[0.3em] opacity-90 font-bold mb-2">Tarification</p>
            <p className="text-4xl font-black mb-2">Sur devis personnalisé</p>
            <p className="text-sm opacity-95 mb-3">
              Le tarif chaîne est étudié au cas par cas en fonction de :
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>· nombre d'établissements à équiper</li>
              <li>· modules retenus par établissement</li>
              <li>· durée d'engagement groupe</li>
              <li>· spécificités d'identité et de déploiement</li>
            </ul>
            <p className="text-xs italic opacity-90 mt-3 pt-3 border-t border-white/20">
              Dégressivité significative à partir de 3 établissements. Devis reçu sous 48h après prise de contact.
            </p>
          </div>

          {/* CTA */}
          <div className="border-2 border-dashed border-orange-400 rounded-xl p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Demande de devis — RDV groupe</p>
            <p className="text-sm mb-3">Échange visio ou sur place pour cadrer votre projet et vous remettre un devis chiffré.</p>
            <p className="text-lg font-black text-gray-900">📞 {vendor.phone}</p>
            <p className="text-sm text-orange-600 font-bold">✉ {vendor.email}</p>
            <p className="text-xs text-gray-500 italic mt-2">
              Demandez <b className="not-italic text-gray-900">{vendor.representant}</b> — Réf. {docMeta.numero}
            </p>
          </div>

          <p className="text-xs text-gray-500 italic text-center mt-4">
            {vendor.raisonSociale} {vendor.formeJuridique && `· ${vendor.formeJuridique}`} · matable.pro
          </p>
        </div>
      )}

      {/* ===== PLAQUETTE TUTO AVIS — Guide A à Z pour obtenir les premiers avis Google ===== */}
      {docType === "tuto-avis" && (
        <TutoAvisSheet vendor={vendor} client={clientData} qrCodeDataUrl={tutoQrCode} />
      )}

      {/* ===== PLAQUETTE AVIS FOCUS — 1 page axée Avis Google, N&B compatible ===== */}
      {docType === "plaquette-avis-focus" && (
        <PlaquetteAvisFocus vendor={vendor} client={clientData} docMeta={docMeta} />
      )}

      {/* ===== PLAQUETTE MENU FOCUS — 1 page axée Menu QR, N&B compatible ===== */}
      {docType === "plaquette-menu-focus" && (
        <PlaquetteMenuFocus vendor={vendor} client={clientData} docMeta={docMeta} />
      )}

      {/* ===== TUTO RÉSERVATIONS — Guide 2 pages couleur ===== */}
      {docType === "tuto-reservations" && (
        <TutoReservationsSheet vendor={vendor} client={clientData} />
      )}

      {/* ===== TUTO RÉSERVATIONS ÉCO — 1 page N&B ===== */}
      {docType === "tuto-reservations-eco" && (
        <TutoReservationsEcoSheet vendor={vendor} client={clientData} />
      )}

      {/* ===== TUTO NOVA IA — 1 page éco encre ===== */}
      {docType === "tuto-nova-ia" && (
        <TutoNovaIaSheet vendor={vendor} client={clientData} />
      )}

      {/* ===== TUTO COMMANDE QR — Guide menu & commandes, N&B éco encre ===== */}
      {docType === "tuto-commande" && (
        <TutoCommandeSheet vendor={vendor} client={clientData} />
      )}

      {/* ===== TUTO AVIS ÉCO — Version N&B ultra légère en encre ===== */}
      {docType === "tuto-avis-eco" && (
        <TutoAvisEcoSheet vendor={vendor} client={clientData} />
      )}

      {/* ===== FLYER DÉMO — A5 paysage générique, 2 par A4 portrait ===== */}
      {docType === "flyer" && (
        <FlyerSheet vendor={vendor} />
      )}

      </div>{/* /contenu zIndex 1 */}
    </div>
  );
});

export default DocumentTemplate;

// ─────────────────────────────────────────────────────────────────────────────
// PLAQUETTE TUTO AVIS — Guide 3 pages A à Z, impression couleur / N&B
// ─────────────────────────────────────────────────────────────────────────────

// ── Mockup téléphone générique ────────────────────────────────────────────────
function PhoneMockup({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: "top center", display: "inline-block" }}>
      <div style={{
        width: 130, background: "#0f172a", borderRadius: 22,
        border: "3px solid #334155", padding: "10px 6px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        position: "relative",
      }}>
        {/* Notch */}
        <div style={{ width: 40, height: 6, background: "#334155", borderRadius: 10, margin: "0 auto 8px" }} />
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", minHeight: 180 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Mockup QR code SVG ────────────────────────────────────────────────────────
function QrMockup({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ display: "block" }}>
      <rect width="80" height="80" fill="#fff" rx="4"/>
      {/* Coin HG */}
      <rect x="4" y="4" width="24" height="24" rx="3" fill="#0f172a"/>
      <rect x="8" y="8" width="16" height="16" rx="1" fill="#fff"/>
      <rect x="11" y="11" width="10" height="10" rx="1" fill="#0f172a"/>
      {/* Coin HD */}
      <rect x="52" y="4" width="24" height="24" rx="3" fill="#0f172a"/>
      <rect x="56" y="8" width="16" height="16" rx="1" fill="#fff"/>
      <rect x="59" y="11" width="10" height="10" rx="1" fill="#0f172a"/>
      {/* Coin BG */}
      <rect x="4" y="52" width="24" height="24" rx="3" fill="#0f172a"/>
      <rect x="8" y="56" width="16" height="16" rx="1" fill="#fff"/>
      <rect x="11" y="59" width="10" height="10" rx="1" fill="#0f172a"/>
      {/* Data bits */}
      {[0,1,0,1,1,0,1].map((v,i) => v ? <rect key={i} x={32+i*3} y="4" width="2" height="2" fill="#0f172a"/> : null)}
      {[1,0,1,0,1,1,0].map((v,i) => v ? <rect key={i} x={32+i*3} y="8" width="2" height="2" fill="#0f172a"/> : null)}
      {[0,1,1,0,0,1,0].map((v,i) => v ? <rect key={i} x={32+i*3} y="12" width="2" height="2" fill="#0f172a"/> : null)}
      {[1,1,0,1,0,0,1].map((v,i) => v ? <rect key={i} x={32+i*3} y="16" width="2" height="2" fill="#0f172a"/> : null)}
      {[0,0,1,1,1,0,1].map((v,i) => v ? <rect key={i} x={32+i*3} y="20" width="2" height="2" fill="#0f172a"/> : null)}
      {[1,0,0,0,1,1,0].map((v,i) => v ? <rect key={i} x={32+i*3} y="24" width="2" height="2" fill="#0f172a"/> : null)}
      {[0,1,0,1,0,0,1].map((v,i) => v ? <rect key={i} x={4+i*4} y="32" width="3" height="3" fill="#0f172a"/> : null)}
      {[1,0,1,1,0,1,0,1,1,0,1,0,1,1,0,1].map((v,i) => v ? <rect key={i} x={4+i*4} y="36" width="3" height="3" fill="#0f172a"/> : null)}
      {[0,1,0,0,1,1,1,0,1,0,0,1,0,1,1,0].map((v,i) => v ? <rect key={i} x={4+i*4} y="40" width="3" height="3" fill="#0f172a"/> : null)}
      {[1,1,1,0,0,1,0,1,0,1,1,0,1,0,0,1].map((v,i) => v ? <rect key={i} x={4+i*4} y="44" width="3" height="3" fill="#0f172a"/> : null)}
      {[0,0,1,1,0,0,1,0,1,1,0,1,0,1,0,0].map((v,i) => v ? <rect key={i} x={4+i*4} y="48" width="3" height="3" fill="#0f172a"/> : null)}
      {[1,0,0,1,1,0,0,1,0,0,1,0,1,0,1,1].map((v,i) => v ? <rect key={i} x={4+i*4} y="52" width="3" height="3" fill="#0f172a"/> : null)}
      {[0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0].map((v,i) => v ? <rect key={i} x={4+i*4} y="56" width="3" height="3" fill="#0f172a"/> : null)}
      {[1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0].map((v,i) => v ? <rect key={i} x={4+i*4} y="60" width="3" height="3" fill="#0f172a"/> : null)}
      {[0,1,0,1,1,1,0,1,1,0,1,1,0,1,0,1].map((v,i) => v ? <rect key={i} x={4+i*4} y="64" width="3" height="3" fill="#0f172a"/> : null)}
      {[1,1,0,0,1,0,1,0,1,1,0,0,1,0,1,1].map((v,i) => v ? <rect key={i} x={4+i*4} y="68" width="3" height="3" fill="#0f172a"/> : null)}
      {[0,0,1,1,0,1,0,1,0,0,1,1,0,1,0,0].map((v,i) => v ? <rect key={i} x={4+i*4} y="72" width="3" height="3" fill="#0f172a"/> : null)}
      {/* Logo central */}
      <rect x="33" y="33" width="14" height="14" rx="3" fill="#fb923c"/>
      <text x="40" y="43" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">M</text>
    </svg>
  );
}

// ── Étoiles ────────────────────────────────────────────────────────────────────
function Stars({ count = 5, filled = 5, size = 14 }: { count?: number; filled?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20">
          <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"
            fill={i < filled ? "#fbbf24" : "#e2e8f0"} />
        </svg>
      ))}
    </span>
  );
}

// ── Badge numéro d'étape ──────────────────────────────────────────────────────
function StepBadge({ num, color }: { num: string; color: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
      fontSize: 14, fontWeight: 900, color: "#fff",
      boxShadow: `0 4px 12px ${color}55`,
    }}>
      {num}
    </div>
  );
}

// ── Carte d'étape ──────────────────────────────────────────────────────────────
function StepCard({ num, color, icon, title, items, mockup, badge }: {
  num: string; color: string; icon: string; title: string;
  items: (string | React.ReactNode)[]; mockup?: React.ReactNode; badge?: string;
}) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "14px 16px",
      background: "#fff", border: `1px solid ${color}40`,
      borderLeft: `4px solid ${color}`, borderRadius: 10,
      pageBreakInside: "avoid", marginBottom: 10,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <StepBadge num={num} color={color} />
        <div style={{ fontSize: 18 }}>{icon}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          {badge && <span style={{ fontSize: 9, background: color + "20", color, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>{badge}</span>}
        </div>
        <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, color: "#475569", lineHeight: 1.7, listStyle: "none" }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 5, marginBottom: 2 }}>
              <span style={{ color, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {mockup && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{mockup}</div>
      )}
    </div>
  );
}

// ── Page A4 wrapper (gère les sauts de page) ──────────────────────────────────
function A4Page({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div style={{
      width: "100%", minHeight: "277mm",
      pageBreakBefore: first ? undefined : "always",
      breakBefore: first ? undefined : "page",
      paddingTop: first ? 0 : "8mm",
      position: "relative",
    }}>
      {children}
    </div>
  );
}

function TutoAvisSheet({ vendor, client, qrCodeDataUrl }: { vendor: Vendor; client: ClientData; qrCodeDataUrl?: string }) {
  /* ─── PAGE 1 : Couverture ──────────────────────────────────────────────── */
  const cover = (
    <A4Page first>
      {/* Fond pleine hauteur — reste dans les marges du template */}
      <div style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 45%, #0f172a 100%)",
        borderRadius: 12, padding: "22px 24px 20px",
        position: "relative", overflow: "hidden",
        marginBottom: 16,
      }}>
        {/* Cercles décoratifs */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(251,146,60,0.15)" }} />
        <div style={{ position: "absolute", top: -20, right: -20, width: 160, height: 160, borderRadius: "50%", border: "1px solid rgba(251,146,60,0.1)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.12)" }} />

        {/* Logo MaTable */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#fb923c,#f97316)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⭐</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>MaTable<span style={{ color: "#fb923c" }}>.Pro</span></div>
            <div style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 2 }}>Plateforme Restaurant</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#64748b" }}>Préparé pour</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{client.name || "Votre Restaurant"}</div>
            {client.email && <div style={{ fontSize: 9, color: "#fb923c" }}>{client.email}</div>}
          </div>
        </div>

        {/* Titre principal */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#fb923c", textTransform: "uppercase", letterSpacing: 3, marginBottom: 10 }}>Guide complet · Avis Google</div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 12 }}>
            Vos premiers avis<br /><span style={{ color: "#fb923c" }}>Google</span> en 7 jours
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6, maxWidth: 280 }}>
            Un guide pas à pas, de la configuration de votre QR code jusqu'aux premières étoiles. Accessible à tous, sans compétences techniques.
          </p>
        </div>

        {/* Mockup central — téléphone + QR + flux */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Phone mockup — ce que voit le client */}
          <div style={{ flexShrink: 0 }}>
            <PhoneMockup>
              {/* Écran d'avis */}
              <div style={{ padding: "10px 8px" }}>
                <div style={{ fontSize: 7, fontWeight: 800, color: "#0f172a", marginBottom: 6, textAlign: "center" }}>Qui vous a servi ? 😊</div>
                {[
                  { name: "Sophie", emoji: "👩‍🍳", rating: 5 },
                  { name: "Marc", emoji: "👨‍🍳", rating: 4 },
                ].map((s) => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 6px", background: "#f8fafc", borderRadius: 8, marginBottom: 4, border: "1px solid #e2e8f0" }}>
                    <div style={{ width: 24, height: 24, background: "#fb923c20", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{s.emoji}</div>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#0f172a" }}>{s.name}</div>
                      <Stars filled={s.rating} size={8} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, background: "linear-gradient(135deg,#fb923c,#f97316)", borderRadius: 8, padding: "6px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 7, fontWeight: 800, color: "#fff" }}>Laisser un avis Google ⭐</div>
                </div>
                <div style={{ marginTop: 6, textAlign: "center", fontSize: 7, color: "#94a3b8" }}>→ Bon de réduction offert 🎁</div>
              </div>
            </PhoneMockup>
            <div style={{ textAlign: "center", fontSize: 8, color: "#64748b", marginTop: 6 }}>Ce que voit votre client</div>
          </div>

          {/* Flèche + étapes résumées */}
          <div style={{ flex: 1, paddingTop: 8 }}>
            {[
              { icon: "🔗", label: "Lien Google My Business", sub: "matable.pro · 2 min" },
              { icon: "🖨️", label: "QR code sur vos tables", sub: "Impression ou NFC" },
              { icon: "🎁", label: "Bon de réduction automatique", sub: "Après chaque ★★★★★" },
              { icon: "💬", label: "Réponse IA aux avis", sub: "Nova IA · 1 clic" },
              { icon: "📊", label: "Suivi de vos résultats", sub: "Dashboard en temps réel" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, background: "rgba(251,146,60,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>{s.sub}</div>
                </div>
                <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: "rgba(251,146,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 8, height: 2, background: "#fb923c", borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bloc chiffres clés */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 20, marginBottom: 20 }}>
        {[
          { stat: "88%", desc: "des clients consultent les avis avant de choisir un restaurant", color: "#fb923c" },
          { stat: "+9%", desc: "de chiffre d'affaires par étoile supplémentaire sur Google", color: "#10b981" },
          { stat: "7j", desc: "suffisent pour obtenir vos premiers avis avec ce guide", color: "#6366f1" },
        ].map(({ stat, desc, color }) => (
          <div key={stat} style={{ background: "#fff", border: `1px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{stat}</div>
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Deux modes QR */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>🪪 Deux façons d'utiliser vos QR codes</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#fff", border: "2px solid #10b981", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#10b981", marginBottom: 4 }}>✅ Mode recommandé — Par serveur</div>
            <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.6 }}>
              Chaque serveur a son <strong>QR/NFC unique</strong>. Le client scanne, choisit qui l'a servi, et laisse son avis. Les avis sont attribués nominativement — vous savez qui performe.
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 4 }}>◎ Mode simplifié — Établissement</div>
            <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.6 }}>
              Un seul QR pour tout le restaurant. Plus simple à gérer, mais aucune attribution individuelle aux serveurs.
            </div>
          </div>
        </div>
      </div>

      {/* Footer page 1 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 8, color: "#94a3b8" }}>{vendor.raisonSociale} · matable.pro · {vendor.email}</div>
        <div style={{ fontSize: 8, color: "#94a3b8" }}>Page 1 / 3</div>
      </div>
    </A4Page>
  );

  /* ─── PAGE 2 : Étapes 1 à 3 ───────────────────────────────────────────── */
  const page2 = (
    <A4Page>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #fb923c" }}>
        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#fb923c,#f97316)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⭐</div>
        <div>
          <div style={{ fontSize: 8, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>Guide Avis Google · {client.name}</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Étapes 1 à 3 — Mise en place</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 8, color: "#94a3b8" }}>matable.pro</div>
      </div>

      {/* ÉTAPE 1 */}
      <StepCard num="1" color="#fb923c" icon="🔗" title="Renseigner votre lien Google My Business"
        mockup={
          <div style={{ width: 110, background: "#0f172a", borderRadius: 16, padding: "8px 6px 10px", border: "2px solid #1e293b" }}>
            <div style={{ width: 30, height: 4, background: "#1e293b", borderRadius: 4, margin: "0 auto 6px" }} />
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 6px" }}>
              <div style={{ fontSize: 6, color: "#94a3b8", marginBottom: 4 }}>Avis → Paramètres</div>
              <div style={{ fontSize: 6, color: "#64748b", marginBottom: 3 }}>Lien Google My Business</div>
              <div style={{ background: "#0f172a", borderRadius: 4, padding: "3px 5px", border: "1px solid #fb923c50", marginBottom: 6 }}>
                <span style={{ fontSize: 5, color: "#fb923c", fontFamily: "monospace" }}>maps.google.com/…</span>
              </div>
              <div style={{ background: "#fb923c", borderRadius: 4, padding: "3px 0", textAlign: "center" }}>
                <span style={{ fontSize: 6, color: "#fff", fontWeight: 700 }}>Enregistrer ✓</span>
              </div>
              <div style={{ marginTop: 6, padding: "4px 5px", background: "#10b98120", borderRadius: 4 }}>
                <span style={{ fontSize: 5, color: "#10b981" }}>✓ Module Avis déjà actif (inclus)</span>
              </div>
            </div>
          </div>
        }
        items={[
          <span key="trial">🎉 <strong>Bonne nouvelle :</strong> votre compte est créé avec 14 jours d'essai gratuit. Le module <strong>⭐ Avis Google</strong> est inclus et actif par défaut — rien à activer.</span>,
          <span key="other">Vous souhaitez tester d'autres modules (Réservations, Nova IA…) ? Rendez-vous dans l'onglet <strong>SAV</strong> de votre dashboard pour en faire la demande.</span>,
          <span key="a">Connectez-vous sur <strong>matable.pro</strong> avec votre email et mot de passe, puis ouvrez <strong>Avis → Paramètres</strong>.</span>,
          <span key="b">Collez votre <strong>lien Google My Business</strong> dans le champ dédié — c'est l'URL de votre fiche Google.</span>,
          <span key="c"><em>Comment trouver ce lien ?</em> Cherchez votre restaurant sur <strong>Google Maps</strong> → bouton <em>"Donner un avis"</em> → copiez l'URL de la page qui s'ouvre.</span>,
        ]}
      />

      {/* ÉTAPE 2 */}
      <StepCard num="2" color="#3b82f6" icon="🖨️" title="Choisir votre mode et installer les QR codes"
        mockup={
          <div style={{ textAlign: "center" }}>
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR code restaurant" style={{ width: 72, height: 72, borderRadius: 6, display: "block" }} />
            ) : (
              <QrMockup size={72} />
            )}
            <div style={{ fontSize: 7, color: "#64748b", marginTop: 4, width: 72, lineHeight: 1.3 }}>Votre QR code<br />à imprimer</div>
          </div>
        }
        items={[
          <span key="a">Dans <strong>Serveurs</strong>, choisissez votre mode via le switch <strong>"ID unique par serveur"</strong> :</span>,
          <span key="b" style={{ paddingLeft: 8, display: "block" }}>✅ <strong>Activé</strong> = créez un profil par serveur → chaque serveur a son propre QR/NFC</span>,
          <span key="c" style={{ paddingLeft: 8, display: "block" }}>◎ <strong>Désactivé</strong> = un seul QR pour tout le restaurant (plus simple)</span>,
          <span key="d">Téléchargez les QR codes depuis le dashboard (<strong>format PNG, prêt à imprimer</strong>).</span>,
          <span key="e">Imprimez et placez-les sur vos tables : support de table, ardoise ou autocollant sur l'addition. Idéalement <strong>après le plat principal</strong>.</span>,
          <span key="f"><strong>Astuce NFC :</strong> utilisez le bouton "Encoder la carte NFC" sur Chrome Android pour programmer des badges sans contact.</span>,
        ]}
      />

      {/* ÉTAPE 3 */}
      <StepCard num="3" color="#10b981" icon="🎁" title="Configurer le bon de réduction automatique"
        mockup={
          <div style={{ width: 100 }}>
            {/* Mockup bon */}
            <div style={{ background: "#fff", border: "2px dashed #10b981", borderRadius: 10, padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>🎁</div>
              <div style={{ fontSize: 7, fontWeight: 800, color: "#065f46" }}>BON DE</div>
              <div style={{ fontSize: 7, fontWeight: 800, color: "#065f46" }}>RÉDUCTION</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981", margin: "4px 0" }}>-10%</div>
              <div style={{ fontSize: 6, color: "#64748b" }}>sur votre prochaine visite</div>
              <div style={{ marginTop: 6, background: "#f0fdf4", borderRadius: 4, padding: "3px 4px" }}>
                <div style={{ fontSize: 6, color: "#16a34a", fontWeight: 700 }}>Valable 30 jours</div>
              </div>
            </div>
            <div style={{ fontSize: 7, color: "#94a3b8", textAlign: "center", marginTop: 4 }}>Envoyé automatiquement<br />après ★★★★★</div>
          </div>
        }
        items={[
          <span key="a">Dans <strong>Avis → Paramètres</strong>, activez le <strong>voucher post-avis</strong>.</span>,
          <span key="b">Choisissez la récompense : <strong>remise en %</strong>, boisson offerte, dessert offert…</span>,
          <span key="c">Définissez la <strong>durée de validité</strong> (recommandé : 30 jours) et un plafond mensuel si besoin.</span>,
          <span key="d">Le bon est envoyé <strong>automatiquement</strong> au client dès qu'il laisse son avis — vous n'avez rien à gérer manuellement.</span>,
          <span key="e"><strong>Conseil :</strong> commencez avec -10% sur la prochaine visite, c'est la récompense qui convertit le mieux.</span>,
        ]}
      />

      {/* Footer page 2 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #e2e8f0", marginTop: 8 }}>
        <div style={{ fontSize: 8, color: "#94a3b8" }}>{vendor.raisonSociale} · matable.pro</div>
        <div style={{ fontSize: 8, color: "#94a3b8" }}>Page 2 / 3</div>
      </div>
    </A4Page>
  );

  /* ─── PAGE 3 : Étapes 4-5 + Checklist + Objectifs ─────────────────────── */
  const page3 = (
    <A4Page>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #6366f1" }}>
        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🚀</div>
        <div>
          <div style={{ fontSize: 8, color: "#6366f1", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>Guide Avis Google · {client.name}</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Étapes 4 & 5 + Checklist 7 jours</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 8, color: "#94a3b8" }}>matable.pro</div>
      </div>

      {/* ÉTAPE 4 — Répondre aux avis */}
      <StepCard num="4" color="#f59e0b" icon="💬" title="Répondre aux avis avec Nova IA"
        mockup={
          <div style={{ width: 110 }}>
            <div style={{ background: "#0f172a", borderRadius: 10, padding: "8px 6px" }}>
              <div style={{ fontSize: 6, color: "#94a3b8", marginBottom: 6 }}>Nouvel avis Google</div>
              <div style={{ background: "#1e293b", borderRadius: 6, padding: "5px 6px", marginBottom: 6 }}>
                <Stars filled={5} size={9} />
                <div style={{ fontSize: 6, color: "#e2e8f0", marginTop: 3, lineHeight: 1.4 }}>"Excellent repas, service impeccable ! Sophie était fantastique."</div>
              </div>
              <div style={{ background: "#f59e0b20", border: "1px solid #f59e0b40", borderRadius: 6, padding: "5px 6px" }}>
                <div style={{ fontSize: 6, color: "#f59e0b", fontWeight: 700, marginBottom: 2 }}>✨ Réponse Nova IA</div>
                <div style={{ fontSize: 6, color: "#e2e8f0", lineHeight: 1.4 }}>"Merci pour ce beau retour ! Nous sommes ravis…"</div>
              </div>
              <div style={{ marginTop: 6, background: "#f59e0b", borderRadius: 4, padding: "3px 0", textAlign: "center" }}>
                <div style={{ fontSize: 6, color: "#fff", fontWeight: 800 }}>Publier sur Google ✓</div>
              </div>
            </div>
          </div>
        }
        items={[
          <span key="a">Dans <strong>Avis → Réponses</strong>, vous verrez tous vos nouveaux avis Google en temps réel.</span>,
          <span key="b"><strong>Nova IA rédige une réponse personnalisée</strong> pour chaque avis — relisez et publiez en 1 clic.</span>,
          <span key="c">Répondez à <strong>tous les avis</strong> (positifs ET négatifs) dans les <strong>24h</strong>.</span>,
          <span key="d">Pour les avis négatifs : remerciez, reconnaissez et proposez une solution. Ne vous défendez pas.</span>,
          <span key="e">Les réponses soignées rassurent les futurs clients et améliorent votre position dans les résultats Google.</span>,
        ]}
      />

      {/* ÉTAPE 5 — Campagnes (bientôt) */}
      <StepCard num="5" color="#8b5cf6" icon="🚀" title="Campagnes SMS / e-mail — Bientôt disponible" badge="En développement"
        mockup={
          <div style={{ width: 90, textAlign: "center" }}>
            <div style={{ background: "#f5f3ff", border: "2px dashed #8b5cf6", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>📣</div>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#6d28d9" }}>Campagnes IA</div>
              <div style={{ fontSize: 6, color: "#8b5cf6", marginTop: 2 }}>SMS · E-mail</div>
              <div style={{ marginTop: 6, background: "#8b5cf620", borderRadius: 4, padding: "3px 4px" }}>
                <div style={{ fontSize: 6, color: "#7c3aed", fontWeight: 700 }}>Bientôt 🔒</div>
              </div>
            </div>
            <div style={{ fontSize: 7, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>Vous serez notifié<br />à l'activation</div>
          </div>
        }
        items={[
          <span key="a">Les campagnes automatiques de relance (SMS & e-mail) sont <strong>en cours de développement</strong> par notre équipe.</span>,
          <span key="b">À terme : relancez vos anciens clients après chaque visite pour maintenir un <strong>flux d'avis constant</strong> chaque semaine.</span>,
          <span key="c">Nova IA rédigera les messages pour vous — personnalisés, au bon moment, dans le bon ton.</span>,
          <span key="d">Vous serez automatiquement notifié par e-mail dès que la fonctionnalité est activée sur votre compte.</span>,
          <span key="e"><strong>En attendant :</strong> encouragez verbalement vos clients satisfaits à scanner le QR code après le repas — c'est souvent suffisant pour démarrer !</span>,
        ]}
      />

      {/* Checklist + Objectifs côte à côte */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
        {/* Checklist 7 jours */}
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span>✅</span> Checklist — 7 premiers jours
          </div>
          {[
            { day: "J1", task: "Activer le module Avis + coller le lien Google" },
            { day: "J1", task: "Choisir : mode serveur ou mode restaurant" },
            { day: "J2", task: "Télécharger et imprimer les QR codes" },
            { day: "J2", task: "Configurer le bon de réduction (-10%)" },
            { day: "J3", task: "Poser les QR sur toutes les tables" },
            { day: "J3", task: "Tester le parcours client : QR → avis → bon" },
            { day: "J4–7", task: "Encourager vos clients à scanner après le repas" },
            { day: "J5–7", task: "Répondre aux premiers avis avec Nova IA" },
          ].map(({ day, task }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
              <div style={{ width: 13, height: 13, border: "1.5px solid #16a34a", borderRadius: 3, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 9, color: "#166534", lineHeight: 1.4 }}>
                <strong style={{ color: "#15803d", marginRight: 3 }}>{day} :</strong>{task}
              </div>
            </div>
          ))}
        </div>

        {/* Objectifs + Contact */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Objectifs */}
          <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius: 10, padding: "12px 14px", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc", marginBottom: 10 }}>🎯 Vos objectifs</div>
            {[
              { period: "Semaine 1", goal: "5 à 10 avis Google", note: "les premiers sont les plus importants", color: "#fb923c" },
              { period: "Mois 1", goal: "25+ avis · ≥ 4,3 ★", note: "votre note commence à grimper", color: "#818cf8" },
              { period: "Mois 3", goal: "50+ avis · ≥ 4,5 ★", note: "vous apparaissez en top résultats", color: "#34d399" },
            ].map(({ period, goal, note, color }) => (
              <div key={period} style={{ marginBottom: 8, padding: "6px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 6, borderLeft: `2px solid ${color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>{period}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color }}>{goal}</span>
                </div>
                <div style={{ fontSize: 8, color: "#64748b" }}>{note}</div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>📞 Une question ?</div>
            <div style={{ fontSize: 9, color: "#475569", lineHeight: 1.8 }}>
              <div>Notre équipe vous accompagne <strong>7j/7</strong></div>
              <div>✉️ <strong style={{ color: "#fb923c" }}>support@matable.pro</strong></div>
              <div>🌐 <strong style={{ color: "#fb923c" }}>matable.pro</strong></div>
              {vendor.phone && <div>📱 {vendor.phone}</div>}
            </div>
            <div style={{ marginTop: 8, background: "#fef9f0", borderRadius: 6, padding: "6px 8px", fontSize: 8, color: "#92400e", lineHeight: 1.5 }}>
              💡 <strong>Conseil :</strong> activez les notifications dans matable.app — vous serez alerté en temps réel à chaque nouvel avis Google.
            </div>
          </div>
        </div>
      </div>

      {/* Footer page 3 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #e2e8f0", marginTop: 10 }}>
        <div style={{ fontSize: 8, color: "#94a3b8" }}>{vendor.raisonSociale} · matable.pro · {vendor.email} · Document confidentiel — {client.name || "votre restaurant"}</div>
        <div style={{ fontSize: 8, color: "#94a3b8" }}>Page 3 / 3</div>
      </div>
    </A4Page>
  );

  return <div style={{ fontFamily: "Arial, sans-serif" }}>{cover}{page2}{page3}</div>;

}

// ─────────────────────────────────────────────────────────────────────────────
// PLAQUETTE AVIS FOCUS — 1 page A4, pitch Avis Google uniquement, N&B friendly
// ─────────────────────────────────────────────────────────────────────────────
function PlaquetteAvisFocus({ vendor, client, docMeta }: { vendor: Vendor; client: ClientData; docMeta: DocMeta }) {
  const bdr = "1px solid #e5e7eb";
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <A4Page first>
        {/* Hero */}
        <div style={{ borderBottom: "3px solid #000", paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            {client.name ? `Préparé pour ${client.name}` : "MaTable.Pro · Module Avis Google"}
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#0f172a", lineHeight: 1.05 }}>
            Plus d'avis Google.<br /><span style={{ fontSize: 22, fontWeight: 700, color: "#374151" }}>Sans rien demander à votre équipe.</span>
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#6b7280", lineHeight: 1.6, maxWidth: 460 }}>
            Le module <strong>Avis Google</strong> de MaTable.Pro automatise 100 % du processus : QR code sur table → avis publié directement sur Google. Vos clients le font en 30 secondes entre le dessert et le café.
          </p>
        </div>

        {/* 3 chiffres clés */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[["70%", "des clients satisfaits ne laissent jamais d'avis (oubli)"], ["+9%", "de CA par étoile supplémentaire sur votre fiche Google"], ["30s", "suffisent à votre client pour laisser un avis complet"]].map(([v, l]) => (
            <div key={v} style={{ border: "2px solid #0f172a", borderRadius: 8, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 8.5, color: "#6b7280", marginTop: 5, lineHeight: 1.5 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Comment ça marche */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, paddingBottom: 6, borderBottom: bdr }}>Comment ça marche — 3 étapes</div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { n: "1", t: "QR code sur chaque table", d: "Un autocollant ou support avec votre QR MaTable. Ou une carte NFC : le client pose son téléphone." },
              { n: "2", t: "Le client laisse son avis", d: "Interface guidée en 30 secondes. Nova IA l'aide à formuler son avis — directement publié sur Google." },
              { n: "3", t: "Il reçoit un bon de réduction", d: "Automatiquement après ★★★★★. Il revient. Vous fidélisez et récoltez des avis en continu." },
            ].map(({ n, t, d }) => (
              <div key={n} style={{ flex: 1, border: bdr, borderTop: "3px solid #000", borderRadius: 8, padding: "12px" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>{n}.</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 5 }}>{t}</div>
                <div style={{ fontSize: 9, color: "#6b7280", lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ce qui est inclus */}
        <div style={{ border: bdr, borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Ce qui est inclus dans le module Avis</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
            {[
              "QR codes uniques par table et par serveur", "Publication directe sur Google Business",
              "Bon de réduction automatique post-avis ★★★★★", "Réponses aux avis rédigées par Nova IA",
              "Dashboard statistiques en temps réel", "Cartes NFC encodables depuis votre smartphone",
              "Avis attribués par serveur (mode pro)", "Notifications instantanées à chaque nouvel avis",
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 900, fontSize: 10, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 9, color: "#374151", lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Témoignage fictif + tarif + CTA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: bdr, borderRadius: 8, padding: "12px 14px", background: "#f9fafb" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>"</div>
            <div style={{ fontSize: 10, color: "#0f172a", lineHeight: 1.7, fontStyle: "italic" }}>
              "On est passés de 47 à 180 avis Google en 3 mois, sans jamais avoir à demander quoi que ce soit à nos clients. Notre note est montée de 4,1 à 4,6. On reçoit plus de réservations depuis."
            </div>
            <div style={{ fontSize: 9, color: "#6b7280", marginTop: 8, fontWeight: 700 }}>— Gérant, restaurant 80 couverts</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ border: "2px solid #0f172a", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 4 }}>Module Avis Google</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>29 €<span style={{ fontSize: 12, fontWeight: 400 }}>/mois</span></div>
              <div style={{ fontSize: 8, color: "#6b7280" }}>HT · Engagement 3 mois minimum</div>
              <div style={{ fontSize: 8, color: "#6b7280", marginTop: 2 }}>Réductions jusqu'à −12 % sur 12 mois</div>
            </div>
            <div style={{ border: "2px dashed #374151", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 5 }}>Démo gratuite — 15 min</div>
              <div style={{ fontSize: 9, color: "#374151", lineHeight: 1.8 }}>
                {vendor.phone && <div>📞 {vendor.phone}</div>}
                <div>✉ {vendor.email}</div>
                <div>🌐 matable.pro</div>
              </div>
              {vendor.representant && <div style={{ fontSize: 8, color: "#6b7280", marginTop: 4 }}>Demandez {vendor.representant} · Réf. {docMeta.numero}</div>}
            </div>
          </div>
        </div>

        <div style={{ borderTop: bdr, paddingTop: 8, marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
          <span>{vendor.raisonSociale} · matable.pro · {vendor.email}</span>
          <span>Module Avis Google · Fiche produit</span>
        </div>
      </A4Page>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAQUETTE MENU FOCUS — 1 page A4, pitch Menu QR uniquement, N&B friendly
// ─────────────────────────────────────────────────────────────────────────────
function PlaquetteMenuFocus({ vendor, client, docMeta }: { vendor: Vendor; client: ClientData; docMeta: DocMeta }) {
  const bdr = "1px solid #e5e7eb";
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <A4Page first>
        {/* Hero */}
        <div style={{ borderBottom: "3px solid #000", paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            {client.name ? `Préparé pour ${client.name}` : "MaTable.Pro · Menu QR & Commande à table"}
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#0f172a", lineHeight: 1.05 }}>
            Vos clients commandent<br /><span style={{ fontSize: 22, fontWeight: 700, color: "#374151" }}>depuis leur téléphone. Sans appli.</span>
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#6b7280", lineHeight: 1.6, maxWidth: 460 }}>
            Le menu QR MaTable.Pro transforme votre carte en menu digital interactif. Scan → commande → paiement, le tout en moins de 2 minutes. Vos serveurs se concentrent sur l'accueil, pas sur la prise de commande.
          </p>
        </div>

        {/* 3 chiffres */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[["+22%", "de panier moyen avec un menu digital vs carte papier"], ["0", "application à télécharger — fonctionne via le navigateur"], ["2min", "de mise à jour de votre carte : modifiez les prix en direct"]].map(([v, l]) => (
            <div key={v} style={{ border: "2px solid #0f172a", borderRadius: 8, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 8.5, color: "#6b7280", marginTop: 5, lineHeight: 1.5 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Avantages */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          {[
            { t: "Pour votre salle", items: ["Commandes directes sans attendre le serveur", "Paiement à table depuis le téléphone", "Gestion de l'affluence sans stress", "Allongement naturel de l'addition (suggestions IA)"] },
            { t: "Pour votre cuisine", items: ["Commandes affichées sur écran cuisine en temps réel", "Zéro erreur de transmission", "Suivi du statut : En préparation → Prête → Servie", "Historique complet par service"] },
          ].map(({ t, items }) => (
            <div key={t} style={{ border: bdr, borderTop: "3px solid #000", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{t}</div>
              {items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontWeight: 900, flexShrink: 0, fontSize: 10 }}>✓</span>
                  <span style={{ fontSize: 9, color: "#374151", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Ce qui est inclus */}
        <div style={{ border: bdr, borderRadius: 8, padding: "12px 16px", marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tout inclus dans le module Menu QR</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px" }}>
            {["Carte illimitée (plats, photos, catégories)", "QR unique par table", "Écran cuisine temps réel", "Mise à jour instantanée de la carte", "Statistiques de commandes", "Cartes NFC optionnelles", "Suggestions IA en fin de commande", "Compatible iPhone & Android", "Paiement intégré (option)"].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 900, fontSize: 9, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 8.5, color: "#374151", lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tarif + CTA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: "2px solid #0f172a", borderRadius: 8, padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 4 }}>Module QR & Commande</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>49 €<span style={{ fontSize: 12, fontWeight: 400 }}>/mois</span></div>
            <div style={{ fontSize: 8, color: "#6b7280" }}>HT · Tables illimitées</div>
            <div style={{ fontSize: 8, color: "#6b7280", marginTop: 3, lineHeight: 1.5 }}>Réductions jusqu'à −12 % sur 12 mois<br />Cumulable avec le module Avis (−10 %)</div>
          </div>
          <div style={{ border: "2px dashed #374151", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Démo en direct — sur votre téléphone</div>
            <div style={{ fontSize: 9, color: "#374151", lineHeight: 1.9 }}>
              {vendor.phone && <div>📞 {vendor.phone}</div>}
              <div>✉ {vendor.email}</div>
              <div>🌐 matable.pro</div>
            </div>
            {vendor.representant && <div style={{ fontSize: 8, color: "#6b7280", marginTop: 4 }}>Demandez {vendor.representant} · Réf. {docMeta.numero}</div>}
          </div>
        </div>

        <div style={{ borderTop: bdr, paddingTop: 8, marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
          <span>{vendor.raisonSociale} · matable.pro · {vendor.email}</span>
          <span>Module Menu QR · Fiche produit</span>
        </div>
      </A4Page>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TUTO RÉSERVATIONS — Guide 2 pages couleur
// ─────────────────────────────────────────────────────────────────────────────
function TutoReservationsSheet({ vendor, client }: { vendor: Vendor; client: ClientData }) {
  const accent = "#6366f1"; // indigo
  const bdr = "1px solid #e5e7eb";

  const SR = ({ num, title, items }: { num: string; title: string; items: string[] }) => (
    <div style={{ display: "flex", gap: 12, padding: "12px 14px", border: bdr, borderLeft: `4px solid ${accent}`, borderRadius: 8, marginBottom: 10, pageBreakInside: "avoid" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{num}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 5 }}>{title}</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {items.map((t, i) => <li key={i} style={{ fontSize: 9.5, color: "#374151", lineHeight: 1.6, paddingLeft: 10, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: accent, fontWeight: 700 }}>›</span>{t}
          </li>)}
        </ul>
      </div>
    </div>
  );

  const page1 = (
    <A4Page first>
      <div style={{ background: `linear-gradient(135deg, #eef2ff 0%, #fff 100%)`, border: `2px solid ${accent}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 5 }}>Guide Réservations · MaTable.Pro</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>Gérez vos réservations en ligne<br /><span style={{ color: accent }}>sans décrocher le téléphone.</span></h1>
        <p style={{ margin: "10px 0 0", fontSize: 10, color: "#475569", lineHeight: 1.7, maxWidth: 440 }}>Le module Réservations de MaTable.Pro ouvre un calendrier en ligne 24h/24. Vos clients réservent directement, avec acompte Stripe et confirmation automatique. Fini les no-shows.</p>
        {client.name && <div style={{ marginTop: 8, fontSize: 9, color: "#6b7280" }}>Préparé pour <strong>{client.name}</strong></div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[["−80%", "de no-shows avec acompte Stripe obligatoire"], ["24h/24", "votre calendrier accepte des réservations même la nuit"], ["0 appel", "pour les réservations simples — tout en ligne"]].map(([v, l]) => (
          <div key={v} style={{ border: `1px solid ${accent}30`, borderTop: `3px solid ${accent}`, borderRadius: 8, padding: "10px", textAlign: "center", background: "#f5f3ff" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 8.5, color: "#6b7280", marginTop: 5, lineHeight: 1.5 }}>{l}</div>
          </div>
        ))}
      </div>

      <SR num="1" title="Activer le module et paramétrer votre agenda"
        items={["Depuis le dashboard MaTable.Pro → Réservations → Paramètres.", "Définissez vos créneaux horaires (ex : 12h–14h30 / 19h–22h) et la durée moyenne d'un repas.", "Indiquez votre capacité (nombre de couverts max par service) et le nombre de couverts minimum par réservation.", "Activez ou désactivez les réservations pour des jours spécifiques (jours fériés, fermeture exceptionnelle)."]}
      />
      <SR num="2" title="Configurer l'acompte anti no-show (Stripe)"
        items={["Dans Réservations → Paiement, connectez votre compte Stripe (5 min — guidé pas à pas).", "Définissez le montant de l'acompte (ex : 10 € par personne ou 20 % du panier estimé).", "L'acompte est prélevé automatiquement à la confirmation. En cas de no-show, vous le conservez.", "Politique d'annulation personnalisable : ex. annulation gratuite jusqu'à 24h avant la réservation."]}
      />
      <SR num="3" title="Partager le lien de réservation"
        items={["Copiez votre lien de réservation personnalisé depuis le dashboard (bouton Copier le lien).", "Ajoutez-le sur votre fiche Google, votre page Instagram, Facebook, votre site web, et vos stories.", "Vous pouvez aussi imprimer un QR code de réservation et le placer en devanture ou en terrasse.", "Astuce : ajoutez le lien en bio Instagram — ça représente 30 % des réservations en ligne."]}
      />

      <div style={{ borderTop: bdr, paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
        <span>{vendor.raisonSociale} · matable.pro</span><span>Page 1 / 2</span>
      </div>
    </A4Page>
  );

  const page2 = (
    <A4Page>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 10, borderBottom: `2px solid ${accent}` }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Gérer les réservations au quotidien</div>
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#6b7280" }}>Réservations · MaTable.Pro</div>
      </div>

      <SR num="4" title="Valider, modifier ou refuser une réservation"
        items={["Toutes les réservations arrivent dans Réservations → À venir, avec heure, couverts, nom et téléphone.", "Validez ou refusez en 1 clic — le client reçoit un email automatique de confirmation ou d'annulation.", "Modifiez l'heure ou le nombre de couverts directement depuis la fiche de réservation.", "En cas de surbooking, MaTable.Pro vous alerte avant que le problème n'arrive."]}
      />
      <SR num="5" title="Gérer les no-shows et les annulations"
        items={["Si un client ne se présente pas, marquez-le comme no-show — l'acompte reste acquis automatiquement.", "Pour les annulations respectant votre délai : remboursement déclenché en 1 clic depuis la fiche.", "Vous pouvez bloquer un client récidiviste depuis Réservations → Clients → Ajouter à la liste noire.", "Statistiques no-shows disponibles dans Réservations → Rapport mensuel."]}
      />
      <SR num="6" title="Analyser vos données et optimiser vos créneaux"
        items={["Dans Réservations → Statistiques : taux de remplissage, créneaux les plus demandés, recettes acomptes.", "Identifiez vos heures creuses et proposez des offres spéciales sur ces créneaux depuis le module Nova IA.", "Exportez le récapitulatif mensuel en PDF pour votre comptable."]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
        <div style={{ border: bdr, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Checklist de mise en service</div>
          {["Module activé + créneaux configurés", "Stripe connecté + acompte défini", "Lien de réservation partagé (Google, Instagram)", "QR réservation imprimé et posé en devanture", "Test complet : réserver + annuler + acompte"].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
              <div style={{ width: 13, height: 13, border: `1.5px solid ${accent}`, borderRadius: 3, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 9, color: "#374151" }}>{t}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#f5f3ff", border: `1px solid ${accent}30`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accent, marginBottom: 6 }}>Bon à savoir</div>
            {["Aucune commission sur les réservations — vous gardez 100 % de l'acompte.", "Compatible Google Reserve (si votre fiche GMB l'autorise).", "Les réservations sont synchronisées en temps réel sur tous vos appareils."].map((t, i) => (
              <div key={i} style={{ fontSize: 9, color: "#374151", lineHeight: 1.6, marginBottom: 3 }}>· {t}</div>
            ))}
          </div>
          <div style={{ border: bdr, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 5 }}>Support</div>
            <div style={{ fontSize: 9, color: "#374151", lineHeight: 1.8 }}>
              ✉ support@matable.pro<br />
              🌐 matable.pro{vendor.phone ? `\n📱 ${vendor.phone}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: bdr, paddingTop: 8, marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
        <span>{vendor.raisonSociale} · matable.pro · {vendor.email}</span><span>Page 2 / 2</span>
      </div>
    </A4Page>
  );

  return <div style={{ fontFamily: "Arial, sans-serif" }}>{page1}{page2}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TUTO RÉSERVATIONS ÉCO — 1 page A4 N&B ultra léger
// ─────────────────────────────────────────────────────────────────────────────
function TutoReservationsEcoSheet({ vendor, client }: { vendor: Vendor; client: ClientData }) {
  const bdr = "1px solid #d1d5db";
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <A4Page first>
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2, marginBottom: 3 }}>Guide Réservations · Éco encre</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>Module Réservations — Prise en main</h1>
          </div>
          <div style={{ textAlign: "right", fontSize: 9, color: "#6b7280" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>MaTable.Pro</div>
            {client.name && <div>{client.name}</div>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { n: "1", t: "Activer + configurer l'agenda", items: ["Dashboard → Réservations → Paramètres.", "Définissez vos créneaux horaires et durée moyenne d'un repas.", "Indiquez le nombre de couverts max par service."] },
            { n: "2", t: "Connecter Stripe (acompte)", items: ["Réservations → Paiement → Connecter Stripe (5 min).", "Définissez le montant de l'acompte par personne.", "Politique d'annulation : délai de remboursement gratuit."] },
            { n: "3", t: "Partager le lien de réservation", items: ["Copiez le lien depuis le dashboard et partagez-le sur Google, Instagram, Facebook.", "Imprimez un QR code réservation pour votre devanture.", "Ajoutez-le en bio Instagram pour capter les réservations directes."] },
            { n: "4", t: "Gérer les réservations au quotidien", items: ["Réservations → À venir : validez, modifiez, refusez.", "No-show : marquez le client → l'acompte reste automatiquement.", "Annulation dans les délais : remboursement en 1 clic."] },
            { n: "5", t: "Analyser et optimiser", items: ["Réservations → Statistiques : taux de remplissage, créneaux populaires.", "Identifiez les heures creuses → lancez des offres spéciales.", "Export PDF mensuel disponible pour la comptabilité."] },
          ].map(({ n, t, items }) => (
            <div key={n} style={{ border: bdr, borderLeft: "3px solid #000", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{n}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>{t}</div>
              </div>
              {items.map((item, i) => <div key={i} style={{ fontSize: 9, color: "#374151", lineHeight: 1.6, paddingLeft: 8, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "#6b7280" }}>›</span>{item}
              </div>)}
            </div>
          ))}
          {/* Checklist 6ème cellule */}
          <div style={{ border: bdr, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Checklist mise en service</div>
            {["Module activé + créneaux configurés", "Stripe connecté + acompte défini", "Lien partagé (Google, Instagram, site)", "QR réservation posé en devanture", "Test complet réservation → annulation"].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 13, height: 13, border: "1px solid #374151", borderRadius: 2, flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 9, color: "#374151" }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, border: bdr, borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Bons à savoir</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
              {["0 % de commission sur les réservations", "Compatible Google Reserve", "Synchronisation temps réel multi-appareils", "Blocage des no-shows récidivistes"].map((t, i) => (
                <div key={i} style={{ fontSize: 8.5, color: "#374151", lineHeight: 1.5 }}>✓ {t}</div>
              ))}
            </div>
          </div>
          <div style={{ border: bdr, borderRadius: 6, padding: "10px 14px", minWidth: 150 }}>
            <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 4 }}>Contact</div>
            <div style={{ fontSize: 9, color: "#374151", lineHeight: 1.8 }}>✉ support@matable.pro<br />🌐 matable.pro{vendor.phone ? `\n📱 ${vendor.phone}` : ""}</div>
          </div>
        </div>

        <div style={{ borderTop: bdr, paddingTop: 8, marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
          <span>{vendor.raisonSociale} · matable.pro — Éco encre</span><span>1 / 1</span>
        </div>
      </A4Page>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TUTO NOVA IA — 1 page A4 éco encre, guide complet de l'assistant IA
// ─────────────────────────────────────────────────────────────────────────────
function TutoNovaIaSheet({ vendor, client }: { vendor: Vendor; client: ClientData }) {
  const bdr = "1px solid #d1d5db";
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <A4Page first>
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2, marginBottom: 3 }}>Guide Nova IA · Éco encre</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>Votre assistant IA MaTable — Nova</h1>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>Tout ce que Nova peut faire pour vous, en un coup d'œil</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 9, color: "#6b7280" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>MaTable.Pro</div>
            {client.name && <div>{client.name}</div>}
          </div>
        </div>

        {/* 3 colonnes de fonctionnalités */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { t: "Avis & réputation", items: ["Réponses aux avis Google personnalisées — relisez et publiez en 1 clic.", "Détection des avis négatifs : alerte immédiate + suggestion de réponse de crise.", "Analyse de sentiment sur vos avis (positifs, neutres, négatifs) avec tendances."] },
            { t: "Menu & descriptions", items: ["Magic Scan : photographiez une carte papier → Nova la transcrit automatiquement.", "Génération de descriptions attrayantes pour chaque plat à partir du nom seul.", "Traduction de la carte en anglais, espagnol, ou autre langue en 1 clic."] },
            { t: "Planning & opérations", items: ["Génération automatique des plannings du personnel selon la charge prévisionnelle.", "Prédiction des heures de pointe à partir de l'historique des commandes.", "Résumé quotidien envoyé par e-mail chaque soir (CA, couverts, incidents)."] },
          ].map(({ t, items }) => (
            <div key={t} style={{ border: bdr, borderLeft: "3px solid #000", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 7 }}>{t}</div>
              {items.map((item, i) => <div key={i} style={{ fontSize: 9, color: "#374151", lineHeight: 1.6, paddingLeft: 8, position: "relative", marginBottom: 3 }}>
                <span style={{ position: "absolute", left: 0, color: "#6b7280" }}>›</span>{item}
              </div>)}
            </div>
          ))}
        </div>

        {/* 2e rangée */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { t: "Finance & comptabilité", items: ["Tableau de bord financier : CA, charges, marges, seuil de rentabilité.", "Alertes automatiques si une dépense est anormalement haute.", "Rapport mensuel exportable en PDF ou CSV pour votre comptable."] },
            { t: "Stock & approvisionnement", items: ["Alerte rupture de stock basée sur la consommation réelle des 30 derniers jours.", "Commandes automatiques suggérées aux fournisseurs (devis pré-remplis).", "Inventaire assisté : scan des codes-barres ou saisie vocale."] },
            { t: "Prospection & NovaAgent", items: ["NovaAgent appelle vos prospects restaurants en voix naturelle.", "Simulation d'appel pour s'entraîner avant un vrai appel.", "Résumé post-appel : intérêt détecté, objections, prochaine action suggérée."] },
          ].map(({ t, items }) => (
            <div key={t} style={{ border: bdr, borderLeft: "3px solid #000", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 7 }}>{t}</div>
              {items.map((item, i) => <div key={i} style={{ fontSize: 9, color: "#374151", lineHeight: 1.6, paddingLeft: 8, position: "relative", marginBottom: 3 }}>
                <span style={{ position: "absolute", left: 0, color: "#6b7280" }}>›</span>{item}
              </div>)}
            </div>
          ))}
        </div>

        {/* Comment y accéder + raccourcis */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 2, border: bdr, borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Accéder à Nova depuis le dashboard</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 20px" }}>
              {[
                ["Avis → Nova IA", "Répondre aux avis Google"], ["Menu → Magic Scan", "Importer une carte papier"],
                ["Planning → Générer", "Planning IA de la semaine"], ["Finance → Rapport", "Rapport mensuel auto"],
                ["Stock → Alertes", "Ruptures et commandes IA"], ["Prospection → NovaAgent", "Appels IA automatisés"],
              ].map(([path, label], i) => (
                <div key={i} style={{ fontSize: 8.5, color: "#374151", lineHeight: 1.5 }}>
                  <strong style={{ color: "#0f172a" }}>{path}</strong> — {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ border: bdr, borderRadius: 6, padding: "10px 12px", flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 4 }}>Conseil d'usage</div>
              <div style={{ fontSize: 8.5, color: "#374151", lineHeight: 1.6 }}>Nova apprend de votre établissement. Plus vous l'utilisez, plus ses suggestions sont précises. Commencez par la réponse aux avis — c'est immédiat et visible.</div>
            </div>
            <div style={{ border: bdr, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 3 }}>Support</div>
              <div style={{ fontSize: 8.5, color: "#374151", lineHeight: 1.7 }}>✉ support@matable.pro<br />🌐 matable.pro</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: bdr, paddingTop: 8, marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
          <span>{vendor.raisonSociale} · matable.pro — Guide Nova IA éco encre</span><span>1 / 1</span>
        </div>
      </A4Page>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TUTO COMMANDE QR — Guide 2 pages N&B, éco encre
// Explique au gérant comment déployer le menu QR et gérer les commandes
// ─────────────────────────────────────────────────────────────────────────────
function TutoCommandeSheet({ vendor, client }: { vendor: Vendor; client: ClientData }) {
  const bdr = "1px solid #d1d5db";
  const accent = "#1e293b"; // tout en N&B

  const StepRow = ({ num, title, items }: { num: string; title: string; items: string[] }) => (
    <div style={{ display: "flex", gap: 12, padding: "12px 14px", border: bdr, borderLeft: `4px solid ${accent}`, borderRadius: 8, marginBottom: 10, pageBreakInside: "avoid" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{title}</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {items.map((t, i) => <li key={i} style={{ fontSize: 10, color: "#374151", lineHeight: 1.6, paddingLeft: 10, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "#6b7280", fontWeight: 700 }}>›</span>{t}
          </li>)}
        </ul>
      </div>
    </div>
  );

  const page1 = (
    <A4Page first>
      {/* En-tête */}
      <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: 14, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Guide d'utilisation · Menu QR</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>Commander avec MaTable.Pro</h1>
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>Comment déployer votre menu QR et gérer vos commandes en 4 étapes</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 9, color: "#6b7280" }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>MaTable<span style={{ color: "#374151" }}>.Pro</span></div>
          {client.name && <div style={{ marginTop: 2 }}>{client.name}</div>}
        </div>
      </div>

      {/* Intro */}
      <div style={{ background: "#f9fafb", border: bdr, borderRadius: 8, padding: "12px 16px", marginBottom: 18, display: "flex", gap: 16 }}>
        <div style={{ fontSize: 9, color: "#374151", lineHeight: 1.7, flex: 1 }}>
          <strong>Votre menu QR MaTable.Pro</strong> permet à vos clients de <strong>consulter la carte et passer commande depuis leur smartphone</strong>, sans application à télécharger. Le serveur reçoit les commandes en temps réel sur son téléphone ou tablette. Ce guide vous accompagne de la mise en place initiale jusqu'à la gestion quotidienne.
        </div>
        <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[["Pas d'app à", "télécharger"], ["Commandes en", "temps réel"], ["Carte modifiable", "en 1 clic"], ["Compatible", "iPhone & Android"]].map(([l1, l2], i) => (
            <div key={i} style={{ border: bdr, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{l1}<br />{l2}</div>
            </div>
          ))}
        </div>
      </div>

      <StepRow num="1" title="Créer et enrichir votre carte"
        items={[
          "Connectez-vous sur matable.pro avec vos identifiants et ouvrez l'onglet Menu.",
          "Créez vos catégories (Entrées, Plats, Desserts, Boissons...) puis ajoutez vos plats : nom, prix, description, photo.",
          "Astuce : ajoutez des photos — les plats avec photo ont 38 % de commandes en plus.",
          "Activez/désactivez un plat en 1 clic si vous êtes en rupture — sans devoir réimprimer quoi que ce soit.",
        ]}
      />

      <StepRow num="2" title="Générer et installer les QR codes"
        items={[
          "Dans Dashboard → Tables, sélectionnez le nombre de tables et cliquez Générer les QR codes.",
          "Téléchargez le PDF ou les PNG, puis imprimez et placez sur chaque table (support, ardoise ou plastifié).",
          "Chaque QR code est unique par table — les commandes arrivent avec le bon numéro de table.",
          "Optionnel : encodez une carte NFC via le bouton dédié (Chrome Android) — le client pose son téléphone et accède directement au menu.",
        ]}
      />

      <StepRow num="3" title="Recevoir et gérer les commandes"
        items={[
          "Activez les notifications sur votre téléphone depuis matable.pro/app — chaque nouvelle commande déclenche une alerte.",
          "Dans Commandes → En cours, validez, préparez ou refusez chaque commande en temps réel.",
          "Le client voit le statut mis à jour sur son écran : Reçue → En préparation → Prête → Servie.",
          "En fin de service, exportez le récapitulatif des commandes depuis l'onglet Historique.",
        ]}
      />

      <StepRow num="4" title="Encaisser et clôturer"
        items={[
          "Le client peut payer directement depuis son téléphone (si le module Paiement est activé) ou appeler le serveur pour régler en caisse.",
          "Chaque table peut être soldée d'un clic : Commandes → Table N° → Clôturer.",
          "Les données de vente (CA, plats les plus commandés, heure de pointe) sont disponibles dans Statistiques.",
        ]}
      />

      <div style={{ borderTop: bdr, paddingTop: 10, marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
        <span>{vendor.raisonSociale} · matable.pro · {vendor.email}</span>
        <span>Page 1 / 2</span>
      </div>
    </A4Page>
  );

  const page2 = (
    <A4Page>
      <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: 12, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Conseils pratiques & FAQ</div>
        <div style={{ fontSize: 9, color: "#6b7280" }}>Menu QR · MaTable.Pro</div>
      </div>

      {/* Deux colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Conseils */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 10, paddingBottom: 6, borderBottom: bdr }}>Bonnes pratiques</div>
          {[
            ["Placez le QR bien visible", "Au centre de la table, lisible sans se baisser. Idéal : support vertical A6."],
            ["Gardez la carte à jour", "Un plat absent ou un prix erroné = friction client. Mettez à jour le soir."],
            ["Formez votre équipe", "5 minutes suffisent. Chaque serveur doit savoir valider une commande sur son téléphone."],
            ["Utilisez les descriptions courtes", "1-2 lignes max par plat. Ça va à l'essentiel et charge plus vite."],
            ["Testez le parcours client", "Scannez votre propre QR, passez une commande de test, vérifiez la réception."],
          ].map(([t, d], i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>{t}</div>
              <div style={{ fontSize: 9, color: "#6b7280", lineHeight: 1.5, marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 10, paddingBottom: 6, borderBottom: bdr }}>Questions fréquentes</div>
          {[
            ["Mon client n'a pas de smartphone ?", "Gardez une carte physique en parallèle pour les clients qui le souhaitent — le QR est un complément, pas un remplacement."],
            ["Le QR code ne fonctionne pas ?", "Vérifiez que votre menu est bien publié (statut vert dans Dashboard → Menu). Si le QR est trop petit, augmentez la taille à l'impression."],
            ["Peut-on modifier le menu en service ?", "Oui ! Les modifications sont instantanées. Le client voit la carte mise à jour à la prochaine ouverture."],
            ["Combien de temps garde-t-on le QR ?", "Le QR code est permanent. Il n'expire jamais — vous n'avez jamais besoin de le réimprimer sauf si vous changez de table."],
            ["Y a-t-il un nombre max de plats ?", "Non, aucune limite. Vous pouvez avoir autant de catégories et plats que vous voulez."],
          ].map(([q, a], i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>{q}</div>
              <div style={{ fontSize: 9, color: "#6b7280", lineHeight: 1.5, marginTop: 2 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist de mise en service */}
      <div style={{ border: bdr, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>Checklist — Mise en service</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
          {[
            "Carte créée avec toutes les catégories", "QR codes imprimés et posés sur les tables",
            "Plats avec photo et prix à jour", "Notifications activées sur le téléphone du serveur",
            "Menu publié (statut vert)", "Test complet du parcours client effectué",
            "NFC encodées si option activée", "Équipe formée (5 min de démo suffisent)",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 14, height: 14, border: `1.5px solid ${accent}`, borderRadius: 3, flexShrink: 0 }} />
              <div style={{ fontSize: 9, color: "#374151" }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div style={{ background: "#f9fafb", border: bdr, borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Une question ? Notre équipe vous répond</div>
          <div style={{ fontSize: 9, color: "#6b7280" }}>✉ support@matable.pro &nbsp;·&nbsp; matable.pro &nbsp;{vendor.phone ? `·  ${vendor.phone}` : ""}</div>
        </div>
        <div style={{ fontSize: 8, color: "#9ca3af", textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>MaTable.Pro</div>
          <div>Votre partenaire digital</div>
        </div>
      </div>

      <div style={{ borderTop: bdr, paddingTop: 10, marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
        <span>{vendor.raisonSociale} · matable.pro · Document confidentiel</span>
        <span>Page 2 / 2</span>
      </div>
    </A4Page>
  );

  return <div style={{ fontFamily: "Arial, sans-serif" }}>{page1}{page2}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TUTO AVIS ÉCO — 1 page A4 N&B ultra léger en encre
// Condensé de tuto-avis : checklist + étapes + objectifs, zéro fond coloré
// ─────────────────────────────────────────────────────────────────────────────
function TutoAvisEcoSheet({ vendor, client }: { vendor: Vendor; client: ClientData }) {
  const bdr = "1px solid #d1d5db";
  const thin = "0.5px solid #e5e7eb";

  return (
    <A4Page first>
      {/* En-tête compact */}
      <div style={{ borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2, marginBottom: 3 }}>Guide Avis Google · Éco encre</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>Vos premiers avis Google — en 5 étapes</h1>
        </div>
        <div style={{ textAlign: "right", fontSize: 9, color: "#6b7280" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>MaTable.Pro</div>
          {client.name && <div>{client.name}</div>}
        </div>
      </div>

      {/* Étapes en 2 colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { num: "1", title: "Renseigner votre lien Google", items: ["Connectez-vous sur matable.pro → Avis → Paramètres.", "Collez votre lien Google My Business dans le champ dédié.", "Comment trouver ce lien : cherchez votre resto sur Google Maps → \"Donner un avis\" → copiez l'URL."] },
          { num: "2", title: "Choisir votre mode QR", items: ["Mode serveur (recommandé) : un QR par serveur, avis attribués nominativement.", "Mode restaurant : un seul QR pour tout l'établissement, plus simple.", "Activez/désactivez depuis Avis → Paramètres → ID unique par serveur."] },
          { num: "3", title: "Imprimer et poser les QR codes", items: ["Téléchargez les QR en PNG depuis le dashboard.", "Imprimez et placez sur chaque table (support, ardoise, autocollant).", "Option NFC : encodez vos cartes via le bouton dédié (Chrome Android)."] },
          { num: "4", title: "Configurer le bon de réduction", items: ["Dans Avis → Paramètres, activez le voucher post-avis.", "Choisissez : -10% sur la prochaine visite (le plus efficace).", "Le bon est envoyé automatiquement après chaque avis ★★★★★."] },
          { num: "5", title: "Répondre avec Nova IA", items: ["Dans Avis → Réponses, tous vos nouveaux avis apparaissent.", "Nova IA rédige une réponse personnalisée — relisez et publiez en 1 clic.", "Répondez dans les 24h, même aux avis négatifs."] },
        ].map(({ num, title, items }) => (
          <div key={num} style={{ border: bdr, borderLeft: "3px solid #000", borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{num}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>{title}</div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {items.map((t, i) => <li key={i} style={{ fontSize: 9, color: "#374151", lineHeight: 1.6, paddingLeft: 8, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "#6b7280" }}>›</span>{t}
              </li>)}
            </ul>
          </div>
        ))}

        {/* Objectifs (6ème cellule = colonne de droite, dernière ligne) */}
        <div style={{ border: bdr, borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Objectifs</div>
          <table style={{ width: "100%", fontSize: 9, borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: thin }}>
              <th style={{ textAlign: "left", color: "#6b7280", paddingBottom: 4, fontWeight: 700 }}>Période</th>
              <th style={{ textAlign: "left", color: "#6b7280", paddingBottom: 4, fontWeight: 700 }}>Cible</th>
            </tr></thead>
            <tbody>
              {[["Semaine 1", "5 à 10 avis Google"], ["Mois 1", "25+ avis · ≥ 4,3 ★"], ["Mois 3", "50+ avis · ≥ 4,5 ★"]].map(([p, g]) => (
                <tr key={p} style={{ borderBottom: thin }}>
                  <td style={{ padding: "4px 0", color: "#374151" }}>{p}</td>
                  <td style={{ padding: "4px 0", fontWeight: 700, color: "#0f172a" }}>{g}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: 8, color: "#6b7280", lineHeight: 1.5 }}>
            +9 % de CA par étoile supplémentaire · 88 % des clients consultent les avis avant de choisir
          </div>
        </div>
      </div>

      {/* Checklist 7 jours */}
      <div style={{ border: bdr, borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Checklist — 7 premiers jours</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px" }}>
          {[
            "J1 : Activer module Avis + lien Google", "J1 : Choisir mode serveur ou restaurant", "J2 : Télécharger et imprimer les QR codes",
            "J2 : Configurer bon de réduction -10%", "J3 : Poser les QR sur toutes les tables", "J3 : Tester le parcours client (QR → avis → bon)",
            "J4-7 : Encourager vos clients à scanner", "J5-7 : Répondre aux avis avec Nova IA", "J7 : Vérifier les stats dans le dashboard",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 12, border: "1px solid #374151", borderRadius: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 8.5, color: "#374151", lineHeight: 1.4 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chiffres clés + Contact */}
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        <div style={{ flex: 1, border: bdr, borderRadius: 6, padding: "10px 12px", display: "flex", gap: 16 }}>
          {[["88%", "clients lisent les avis avant de choisir"], ["+9%", "CA par étoile gagnée sur Google"], ["7j", "pour obtenir les premiers avis"]].map(([v, l]) => (
            <div key={v} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 8, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ border: bdr, borderRadius: 6, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 160 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Support & contact</div>
          <div style={{ fontSize: 9, color: "#374151", lineHeight: 1.8 }}>
            ✉ support@matable.pro<br />
            🌐 matable.pro<br />
            {vendor.phone ? `📱 ${vendor.phone}` : ""}
          </div>
        </div>
      </div>

      <div style={{ borderTop: bdr, paddingTop: 8, marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
        <span>{vendor.raisonSociale} · matable.pro · {vendor.email} — Document optimisé économie d'encre</span>
        <span>1 / 1 · Imprimer plusieurs copies pour vos serveurs</span>
      </div>
    </A4Page>
  );
}

// Re-exports depuis pricing.ts pour rétro-compatibilité avec les imports
// existants ailleurs dans le code (DocumentsClient, DocumentViewerClient).
export { computeQuote, MODULES, DURATIONS, eur };
export type { DurationKey, ModuleId, QuoteLine, Quote };

// Fallback : calcule un priceInfo en supposant que seul le module "avis" est actif
// (= configuration minimale). Utilisé pour les anciens documents sauvegardés
// qui n'ont pas encore de `selectedModules` en data.
export function computePriceInfo(engagement: string): PriceInfo {
  return computeQuote(["avis"], (engagement as any) ?? "12m");
}
