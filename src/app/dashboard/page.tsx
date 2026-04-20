export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestion des restaurants</h1>
          <p className="text-slate-400">Suivi des abonnements et comptes restaurateurs</p>
        </div>
        <button className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold">
          + Ajouter un restaurant
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-slate-300 text-sm">
            <tr>
              <th className="px-6 py-4 font-semibold">Restaurant</th>
              <th className="px-6 py-4 font-semibold">Gérant</th>
              <th className="px-6 py-4 font-semibold">Plan</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold">Le Gourmet {i}</div>
                  <div className="text-xs text-slate-500">legourmet-{i}.matable.pro</div>
                </td>
                <td className="px-6 py-4 text-sm">thomas{i}@example.com</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20">
                    {i === 2 ? "STARTER" : "PRO"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-emerald-400">Actif</td>
                <td className="px-6 py-4">
                  <button className="text-slate-400 hover:text-white transition-colors">Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
