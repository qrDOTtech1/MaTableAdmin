import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [totalRestos, totalOrders, totalUsers, totalReservations] = await Promise.all([
    prisma.restaurant.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.reservation.count(),
  ]);

  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { table: { include: { restaurant: true } } }
  }) as any[];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Statistiques Plateforme</h1>
        <p className="text-slate-400">Vue d'ensemble de l'activité de MaTable</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Restaurants" value={totalRestos} icon="🏢" color="text-orange-500" />
        <StatCard title="Commandes" value={totalOrders} icon="⚡" color="text-emerald-500" />
        <StatCard title="Clients Inscrits" value={totalUsers} icon="👤" color="text-blue-500" />
        <StatCard title="Réservations" value={totalReservations} icon="📅" color="text-purple-500" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold">10 Dernières Commandes</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Restaurant</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {recentOrders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium">{o.table.restaurant.name}</td>
                <td className="px-6 py-4">{(o.totalCents / 100).toFixed(2)} €</td>
                <td className="px-6 py-4 text-slate-400">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    o.status === "PAID" ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                  }`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="text-sm font-medium text-slate-400">{title}</div>
      <div className={`text-4xl font-black mt-1 ${color}`}>{value}</div>
    </div>
  );
}
