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
@page { size: A4; margin: 0; }
html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
/* Le nœud du document conserve sa largeur 210mm, on retire son ombre */
body > div { box-shadow: none !important; margin: 0 auto !important; }
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
