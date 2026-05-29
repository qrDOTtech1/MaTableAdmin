/**
 * /api/admin/charges
 *  - POST (multipart/form-data) : crée une charge (avec fichier optionnel)
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Limite raisonnable pour des factures (PDF/JPG/PNG) — 10 Mo
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_CATEGORIES = [
  "SERVEUR", "IA_API", "TELEPHONIE", "LOGICIEL_SAAS",
  "MARKETING", "FOURNITURES", "DEPLACEMENT", "AUTRE",
];

function toCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "0").trim().replace(",", ".").replace(/\s/g, "");
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const category = String(fd.get("category") ?? "").toUpperCase();
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  const supplier = String(fd.get("supplier") ?? "").trim();
  if (!supplier) return NextResponse.json({ error: "Fournisseur requis" }, { status: 400 });
  const label = (String(fd.get("label") ?? "").trim() || null);
  const dateIssuedStr = String(fd.get("dateIssued") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIssuedStr)) {
    return NextResponse.json({ error: "Date invalide (YYYY-MM-DD)" }, { status: 400 });
  }
  const dateIssued = new Date(dateIssuedStr + "T00:00:00Z");

  const amountHtCents = toCents(fd.get("amountHt"));
  const vatRatePct = Math.max(0, Math.min(100, parseInt(String(fd.get("vatRatePct") ?? "20"), 10) || 0));
  const vatAmountCents = Math.round(amountHtCents * vatRatePct / 100);
  const amountTtcCents = amountHtCents + vatAmountCents;
  const currency = String(fd.get("currency") ?? "EUR").toUpperCase();
  const vatDeductible = fd.get("vatDeductible") === "on" || fd.get("vatDeductible") === "true" || fd.get("vatDeductible") === null; // par défaut true
  const paid = fd.get("paid") !== "false";
  const notes = String(fd.get("notes") ?? "").trim() || null;

  if (amountHtCents <= 0) {
    return NextResponse.json({ error: "Montant HT requis" }, { status: 400 });
  }

  // Fichier optionnel
  let fileName: string | null = null;
  let fileMime: string | null = null;
  let fileData: string | null = null;
  let fileSize: number | null = null;
  const f = fd.get("file");
  if (f && typeof f === "object" && "arrayBuffer" in f) {
    const buf = Buffer.from(await (f as File).arrayBuffer());
    if (buf.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)` }, { status: 413 });
    }
    fileName = (f as File).name || "facture";
    fileMime = (f as File).type || "application/octet-stream";
    fileData = buf.toString("base64");
    fileSize = buf.length;
  }

  const id = `sup_${crypto.randomBytes(10).toString("hex")}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "SupplierInvoice"
       ("id","category","supplier","label","dateIssued","amountHtCents","vatRatePct","vatAmountCents","amountTtcCents","currency","vatDeductible","paid","notes","fileName","fileMime","fileData","fileSize")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    id, category, supplier, label, dateIssued, amountHtCents, vatRatePct, vatAmountCents, amountTtcCents,
    currency, vatDeductible, paid, notes, fileName, fileMime, fileData, fileSize,
  );

  return NextResponse.json({ ok: true, id });
}
