import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  refereeId: string;
  refereeName: string;
  refereeCreatedAt: Date;
  refereeRewardGranted: boolean;
  refereeReferredByCode: string;
  referrerId: string | null;
  referrerName: string | null;
};

export default async function ParrainagesPage() {
  let rows: Row[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT
         referee.id                    AS "refereeId",
         referee.name                  AS "refereeName",
         referee."createdAt"           AS "refereeCreatedAt",
         referee."referralRewardGranted" AS "refereeRewardGranted",
         referee."referredByCode"      AS "refereeReferredByCode",
         referrer.id                   AS "referrerId",
         referrer.name                 AS "referrerName"
       FROM "Restaurant" referee
       LEFT JOIN "Restaurant" referrer ON referrer."referralCode" = referee."referredByCode"
       WHERE referee."referredByCode" IS NOT NULL
       ORDER BY referee."createdAt" DESC
       LIMIT 500`
    );
  } catch {
    rows = [];
  }

  // Marquer "converti" si une facture payée existe
  const ids = rows.map((r) => r.refereeId);
  let paidSet = new Set<string>();
  if (ids.length > 0) {
    try {
      const inv = await prisma.$queryRawUnsafe<Array<{ restaurantId: string }>>(
        `SELECT DISTINCT "restaurantId" FROM "SubscriptionEvent" WHERE "restaurantId" = ANY($1::text[]) AND "amountCents" > 0`,
        ids,
      );
      paidSet = new Set(inv.map((x) => x.restaurantId));
    } catch {}
  }

  const totalConverted = rows.filter((r) => paidSet.has(r.refereeId)).length;
  const totalRewarded = rows.filter((r) => r.refereeRewardGranted).length;

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Parrainages</h1>
        <p className="text-slate-400">Suivi des restos qui se parrainent — 1 mois offert au parrain à la 1ère facture du filleul.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Filleuls inscrits" value={rows.length} />
        <Card label="Convertis" value={totalConverted} tone="amber" />
        <Card label="Récompenses versées" value={totalRewarded} tone="emerald" />
        <Card label="Taux de conversion" value={rows.length > 0 ? `${Math.round((totalConverted / rows.length) * 100)} %` : "—"} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Parrain</th>
              <th className="px-4 py-3">Filleul</th>
              <th className="px-4 py-3">Code utilisé</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3 text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                Aucun parrainage encore. Les codes apparaîtront dès que des restos s'inscriront avec un lien ?ref=
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.refereeId} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium">{r.referrerName ?? <span className="text-slate-500 italic">code invalide</span>}</td>
                <td className="px-4 py-3 font-medium">{r.refereeName}</td>
                <td className="px-4 py-3 font-mono text-xs text-orange-300">{r.refereeReferredByCode}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(r.refereeCreatedAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 text-right">
                  {r.refereeRewardGranted ? (
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400">🎉 +30 j versés</span>
                  ) : paidSet.has(r.refereeId) ? (
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-500/15 text-amber-400">Converti (à récompenser)</span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-slate-700/40 text-slate-300">En essai</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, tone = "white" }: { label: string; value: React.ReactNode; tone?: "white" | "emerald" | "amber" }) {
  const colors: Record<string, string> = {
    white: "text-white",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
    </div>
  );
}
