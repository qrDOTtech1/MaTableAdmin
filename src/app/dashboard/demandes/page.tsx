import { prisma } from "@/lib/db";
import DemandesClient from "./DemandesClient";

export const dynamic = "force-dynamic";

export default async function DemandesPage() {
  let requests: any[] = [];
  let migrationPending = false;
  try {
    requests = await (prisma as any).pricingRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch (e: any) {
    if (e?.code === "P2021") migrationPending = true;
    else throw e;
  }

  if (migrationPending) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-200">
          <h1 className="text-xl font-bold mb-2">⚠ Migration DB en attente</h1>
          <p className="text-sm">Appliquer <code>prisma/migrations/add_pricing_request.sql</code> sur la base.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🎯 Demandes de souscription</h1>
        <p className="text-slate-400 text-sm mt-1">
          Demandes envoyées depuis le formulaire <b>/tarifs</b> de la landing. Cliquez sur une ligne
          pour ouvrir les détails et générer le contrat correspondant.
        </p>
      </div>
      <DemandesClient
        requests={requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          convertedAt: r.convertedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
