import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import DocumentsClient from "./DocumentsClient";

const prisma = new PrismaClient();

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
      </div>

      <DocumentsClient restaurant={defaultRestaurantData} />
    </div>
  );
}
