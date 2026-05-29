import { prisma } from "@/lib/db";
import { FacturesClient, type Invoice } from "./FacturesClient";

export const dynamic = "force-dynamic";

export default async function FacturesPage() {
  let invoices: Invoice[] = [];
  try {
    invoices = await prisma.$queryRawUnsafe<Invoice[]>(
      `SELECT id, "createdAt", "restaurantName", "restaurantId", plan, method,
              "amountCents", "interval", "invoiceNumber", "stripeInvoiceUrl", note
       FROM "SubscriptionEvent"
       WHERE "amountCents" > 0
       ORDER BY "createdAt" DESC
       LIMIT 2000`
    );
  } catch {
    invoices = [];
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Factures émises</h1>
        <p className="text-slate-400">Historique des paiements encaissés (Stripe &amp; manuels) — export PDF.</p>
      </div>
      <FacturesClient invoices={invoices} />
    </div>
  );
}
