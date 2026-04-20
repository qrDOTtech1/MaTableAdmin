import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { updateRestaurant, deleteRestaurant } from "@/lib/admin-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RestaurantManagePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      users: true,
      tables: true,
      menuItems: true,
      orders: { take: 5, orderBy: { createdAt: "desc" } }
    }
  });

  if (!restaurant) notFound();

  async function handleDelete() {
    "use server";
    await deleteRestaurant(id);
    redirect("/dashboard");
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">← Retour</Link>
        <h1 className="text-3xl font-bold">Gérer : {restaurant.name}</h1>
        <div className="ml-auto text-xs text-slate-500 font-mono">ID: {restaurant.id}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulaire de modification */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Informations Générales</h2>
          <form action={updateRestaurant.bind(null, id)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nom du restaurant</label>
              <input 
                name="name"
                defaultValue={restaurant.name}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Slug (URL)</label>
              <input 
                name="slug"
                defaultValue={restaurant.slug || ""}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono" 
              />
            </div>
            <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Enregistrer les modifications
            </button>
          </form>
        </div>

        {/* Statistiques rapides */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-xl font-bold">Activité</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-xs text-slate-400">Tables</div>
              <div className="text-2xl font-bold">{restaurant.tables.length}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-xs text-slate-400">Plats au menu</div>
              <div className="text-2xl font-bold">{restaurant.menuItems.length}</div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 mb-2">Utilisateurs (Staff)</h3>
            <ul className="space-y-2">
              {restaurant.users.map(u => (
                <li key={u.id} className="text-sm text-slate-300 flex items-center justify-between">
                  <span>{u.email}</span>
                  <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded uppercase">Owner</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Zone de danger */}
      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl">
        <h2 className="text-xl font-bold text-red-400 mb-2">Zone de Danger</h2>
        <p className="text-red-400/60 text-sm mb-4">La suppression d'un restaurant est irréversible et supprimera toutes les commandes, menus et accès liés.</p>
        <form action={handleDelete}>
          <button className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Supprimer définitivement le restaurant
          </button>
        </form>
      </div>
    </div>
  );
}
