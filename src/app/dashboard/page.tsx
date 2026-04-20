import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const restaurants = await prisma.restaurant.findMany({
    include: {
      users: {
        take: 1,
        select: { email: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion des restaurants</h1>
          <p className="text-slate-400">Suivi des abonnements et comptes restaurateurs ({restaurants.length})</p>
        </div>
        <button className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold transition-colors">
          + Ajouter un restaurant
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-slate-300 text-sm">
            <tr>
              <th className="px-6 py-4 font-semibold">Restaurant</th>
              <th className="px-6 py-4 font-semibold">Gérant</th>
              <th className="px-6 py-4 font-semibold">Slug</th>
              <th className="px-6 py-4 font-semibold">Date Inscription</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {restaurants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Aucun restaurant inscrit pour le moment.
                </td>
              </tr>
            ) : (
              restaurants.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {r.users[0]?.email || "Aucun utilisateur"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-orange-400">
                      {r.slug || "non-défini"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors">Gérer</button>
                      <button className="text-slate-500 hover:text-red-400 text-sm font-medium transition-colors">Suspendre</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
