import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import DocumentsClient from "./DocumentsClient";

export default async function RestaurantDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
  });

  if (!restaurant) {
    return notFound();
  }

  // Fallbacks si le restaurant n'a pas toutes les infos
  const defaultRestaurantData = {
    name: restaurant.name,
    address: restaurant.address || "Adresse à compléter",
    siret: "SIRET en cours d'attribution",
    managerName: "Nom du gérant à compléter",
    email: restaurant.email || "Email à compléter",
    phone: restaurant.phone || "Téléphone à compléter",
    slug: restaurant.slug || "slug-restaurant",
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents contractuels</h1>
          <p className="text-gray-500">Gérer les devis, contrats et factures pour {restaurant.name}</p>
        </div>
        <a
          href={`/dashboard/restaurants/${id}/documents/historique`}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-sm font-semibold border border-slate-700 transition-colors"
        >
          📂 Classeur ({restaurant.name})
        </a>
      </div>

      <DocumentsClient restaurantId={id} restaurant={defaultRestaurantData} />
    </div>
  );
}
