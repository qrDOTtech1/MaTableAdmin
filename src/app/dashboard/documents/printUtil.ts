/**
 * Impression d'un nœud DOM dans une fenêtre dédiée + ouverture du dialog
 * d'impression du navigateur (qui propose nativement "Enregistrer au format PDF").
 *
 * Plus fiable que html2pdf.js sur Tailwind v4 (qui utilise `oklch()` non
 * supporté par html2canvas). Ici aucun parsing JS — c'est le moteur de
 * rendu du navigateur qui s'occupe de tout.
 */
export function printDocumentNode(node: HTMLElement, title = "Document") {
  // 1. Récupère tout le CSS de la page (Tailwind + globals) en inline.
  //    Les feuilles same-origin sont accessibles via cssRules ; on les
  //    sérialise. Pour les feuilles externes (rare ici), on les laissera
  //    via <link> sur l'URL d'origine.
  let inlineCss = "";
  const externalLinks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules; // peut throw si cross-origin
      for (const rule of Array.from(rules)) inlineCss += rule.cssText + "\n";
    } catch {
      if (sheet.href) externalLinks.push(sheet.href);
    }
  }

  const linksHtml = externalLinks.map((h) => `<link rel="stylesheet" href="${h}">`).join("\n");
  const docHtml = node.outerHTML;

  // 2. Ouvre une nouvelle fenêtre.
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) {
    alert(
      "Pop-up bloquée — autorisez les pop-ups pour ce site puis réessayez.\n" +
        "Sinon utilisez Ctrl+P sur cette page directement."
    );
    return;
  }

  // 3. Injecte le doc + CSS + script qui déclenche print() à la fin du chargement.
  w.document.open();
  w.document.write(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
${linksHtml}
<style>
${inlineCss}
/* === Surcharges spécifiques impression === */
@page {
  size: A4 portrait;
  margin: 0;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: white !important;
}
body {
  /* Conserve les couleurs (bannières orange, en-têtes de tableau) */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
/* Le nœud du document conserve sa largeur 210mm, on retire son ombre */
body > div {
  box-shadow: none !important;
  margin: 0 auto !important;
}

.matable-print-doc {
  box-sizing: border-box !important;
  overflow: visible !important;
}

.matable-print-content {
  font-size: 11px !important;
  line-height: 1.32 !important;
}

.matable-print-content p,
.matable-print-content li,
.matable-print-content td,
.matable-print-content th {
  line-height: 1.32 !important;
}

.matable-print-content p { margin-top: 0 !important; }
.matable-print-content h1 { margin-top: 0 !important; margin-bottom: 10px !important; padding-bottom: 8px !important; }
.matable-print-content h2 { margin-top: 9px !important; margin-bottom: 5px !important; padding-top: 7px !important; }
.matable-print-content h3 { margin-bottom: 5px !important; }
.matable-print-content table { margin-top: 4px !important; margin-bottom: 8px !important; }
.matable-print-content th,
.matable-print-content td { padding: 6px 7px !important; vertical-align: top !important; }
.matable-print-content ul { margin-top: 3px !important; margin-bottom: 7px !important; }
.matable-print-content .mb-8 { margin-bottom: 14px !important; }
.matable-print-content .mb-6 { margin-bottom: 10px !important; }
.matable-print-content .mb-4 { margin-bottom: 7px !important; }
.matable-print-content .mt-12 { margin-top: 18px !important; }
.matable-print-content .p-4 { padding: 9px !important; }
.matable-print-content .p-3 { padding: 7px !important; }
.matable-print-content .gap-8 { gap: 16px !important; }
.matable-print-content .gap-6 { gap: 12px !important; }

/* Les guides très visuels débordaient parfois en PDF : on compacte sans rien masquer. */
.matable-print-doc [style*="minHeight: 277mm"],
.matable-print-doc [style*="min-height: 277mm"] {
  min-height: 268mm !important;
}

/* Suggestion d'impression recto-seul (le navigateur respecte si supporté) */
@media print {
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  /* Évite de couper un bloc signature ou un tableau de prix au milieu */
  .grid, table, tr, h2, .signature-block { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; }

  .matable-print-doc {
    width: 210mm !important;
    min-height: 297mm !important;
    padding: 12mm 10mm 12mm 10mm !important;
    transform: none !important;
  }

  .matable-print-content {
    font-size: 10.5px !important;
    line-height: 1.28 !important;
  }

  .matable-print-content .text-sm { font-size: 10.5px !important; }
  .matable-print-content .text-xs { font-size: 9px !important; }
  .matable-print-content .text-\[10\.5px\] { font-size: 8.8px !important; }
  .matable-print-content .text-xl { font-size: 16px !important; }
  .matable-print-content .text-2xl { font-size: 19px !important; }

  .matable-print-content p { margin-bottom: 5px !important; }
  .matable-print-content h2 { margin-top: 7px !important; margin-bottom: 4px !important; padding-top: 6px !important; }
  .matable-print-content th,
  .matable-print-content td { padding: 5px 6px !important; }
  .matable-print-content ul { margin-bottom: 5px !important; }

  /* Force le rendu une seule face : on définit la taille de page sans verso.
     Les navigateurs ne peuvent pas réellement forcer le mode "recto seul",
     mais on s'assure que le contenu reste compact et tient sur des pages
     simples. */
}
</style>
</head>
<body>
${docHtml}
<script>
  // Attend que les fonts + images soient chargées avant d'imprimer.
  Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(function(res){ if (document.readyState === "complete") res(null); else window.addEventListener("load", res); })
  ]).then(function(){
    setTimeout(function(){
      window.focus();
      window.print();
      // Ne ferme pas la fenêtre automatiquement : sur certains navigateurs
      // (Firefox), fermer pendant le print annule le job. L'utilisateur
      // ferme manuellement après avoir choisi PDF ou imprimante.
    }, 200);
  });
</script>
</body>
</html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]!));
}
