"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrStickerWidget({ slug, restaurantName }: { slug: string; restaurantName: string }) {
  const reviewUrl = `https://matable.pro/r/${slug}/review`;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [nfcWriting, setNfcWriting] = useState(false);
  const [nfcWritten, setNfcWritten] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(reviewUrl, {
      width: 400, margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => {});
  }, [reviewUrl]);

  const printStickers = () => {
    if (!qrDataUrl) return;
    const win = window.open("", "_blank", "width=800,height=700");
    if (!win) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Autocollants QR Avis — ${restaurantName}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#fff; font-family:'Helvetica Neue',Arial,sans-serif; }
      @media print { body { margin:0; } .sticker { break-inside:avoid; page-break-inside:avoid; } }
      .page { display:flex; flex-direction:column; align-items:center; gap:20px; padding:20px; }
      .sticker {
        display:flex; flex-direction:column; align-items:center;
        width:210px; border:1.5px dashed #d1d5db; border-radius:16px;
        padding:18px 16px 14px; background:#fff; gap:8px;
      }
      .headline { font-size:14px; font-weight:900; color:#111; text-align:center; line-height:1.25; }
      .stars { font-size:20px; letter-spacing:3px; }
      .qr img { width:140px; height:140px; display:block; border-radius:8px; }
      .sep { width:80%; height:1px; background:#f1f5f9; }
      .cta { font-size:11px; font-weight:800; color:#f97316; text-align:center; letter-spacing:0.5px; text-transform:uppercase; }
      .brand { font-size:9px; color:#94a3b8; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; }
      .restaurant { font-size:10px; color:#475569; font-weight:700; text-align:center; }
    </style></head><body>
    <div class="page">
      ${[0,1,2].map(() => `
      <div class="sticker">
        <p class="headline">⭐ Donnez-nous<br>un avis !</p>
        <p class="stars">⭐⭐⭐⭐⭐</p>
        <div class="sep"></div>
        <div class="qr"><img src="${qrDataUrl}" alt="QR avis"/></div>
        <div class="sep"></div>
        <p class="cta">Scannez &amp; laissez votre avis</p>
        <p class="restaurant">${restaurantName}</p>
        <p class="brand">MaTable.Pro</p>
      </div>`).join("")}
    </div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const writeNfc = async () => {
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

  return (
    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">🪪 QR Code Avis — Restaurant</p>

      {/* URL */}
      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
        <span className="font-mono text-[10px] text-slate-400 flex-1 truncate">{reviewUrl}</span>
        <button onClick={() => navigator.clipboard.writeText(reviewUrl)}
          className="text-xs text-orange-400 hover:text-orange-300 font-semibold shrink-0">📋</button>
      </div>

      {/* QR preview + actions */}
      {qrDataUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-white p-1">
              <img src={qrDataUrl} alt="QR avis" className="w-full h-full" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-400">QR global — tablettes, cartes NFC, autocollants.</p>
              <a href={qrDataUrl} download={`qr-avis-${slug}.png`}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
                ⬇ Télécharger PNG
              </a>
            </div>
          </div>

          {/* Print stickers x3 */}
          <button onClick={printStickers}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 rounded-xl text-orange-300 transition-colors">
            🖨️ Imprimer autocollants ×3
            <span className="text-[10px] text-orange-400/60 font-normal">"Donnez-nous un avis !"</span>
          </button>

          {/* NFC encoder */}
          <button onClick={writeNfc} disabled={nfcWriting}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl text-blue-300 transition-colors disabled:opacity-60">
            {nfcWriting
              ? <><span className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin shrink-0" />Approchez la carte NFC…</>
              : nfcWritten ? "✅ Carte NFC encodée !" : "📱 Encoder une carte NFC"}
          </button>
          <p className="text-[10px] text-slate-600">⚠ NFC : Chrome Android uniquement. iPhone → app <em>NFC Tools</em> + coller l'URL.</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
          Génération du QR…
        </div>
      )}
    </div>
  );
}
