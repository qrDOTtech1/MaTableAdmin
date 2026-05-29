import { prisma } from "@/lib/db";
import { ChargesClient, type Charge } from "./ChargesClient";

export const dynamic = "force-dynamic";

type Row = Omit<Charge, "dateIssued" | "createdAt"> & { dateIssued: Date; createdAt: Date };

export default async function ChargesPage() {
  let rows: Row[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT id, category, supplier, label, "dateIssued", "amountHtCents", "vatRatePct",
              "vatAmountCents", "amountTtcCents", currency, "vatDeductible", paid, notes,
              "fileName", "fileMime", "fileSize", "createdAt"
         FROM "SupplierInvoice"
        ORDER BY "dateIssued" DESC, "createdAt" DESC
        LIMIT 2000`
    );
  } catch { rows = []; }

  const charges: Charge[] = rows.map(r => ({
    ...r,
    dateIssued: r.dateIssued.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Charges & TVA</h1>
        <p className="text-slate-400">
          Factures fournisseurs (serveurs, IA, télécom, SaaS, fournitures…) — TVA récupérable calculée en temps réel.
        </p>
      </div>
      <ChargesClient charges={charges} />
    </div>
  );
}
