import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import DocumentsListClient from "../../../../documents/DocumentsListClient";

export const dynamic = "force-dynamic";

export default async function RestaurantClasseurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
  if (!restaurant) return notFound();

  const docs = await prisma.generatedDocument.findMany({
    where: { restaurantId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Classeur — {restaurant.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {docs.length} document{docs.length > 1 ? "s" : ""} enregistré{docs.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/dashboard/restaurants/${id}/documents`}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          + Nouveau document
        </Link>
      </div>

      <DocumentsListClient
        documents={docs.map((d) => ({
          id: d.id,
          number: d.number,
          type: d.type,
          title: d.title,
          totalCents: d.totalCents,
          createdAt: d.createdAt.toISOString(),
          signedAt: d.signedAt?.toISOString() ?? null,
          archivedInMonth: d.archivedInMonth,
          restaurantName: restaurant.name,
          restaurantId: restaurant.id,
        }))}
        hideRestaurantColumn
      />
    </div>
  );
}
