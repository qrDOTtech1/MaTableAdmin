import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import DocumentViewerClient from "./DocumentViewerClient";

export const dynamic = "force-dynamic";

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let doc: any = null;
  try {
    doc = await prisma.generatedDocument.findUnique({
      where: { id },
      include: { restaurant: { select: { id: true, name: true, slug: true } } },
    });
  } catch (e: any) {
    if (e?.code === "P2021") {
      return (
        <div className="p-6 max-w-2xl">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-200">
            <h1 className="text-xl font-bold mb-2">⚠ Migration DB en attente</h1>
            <p className="text-sm">Appliquez d'abord le SQL de migration.</p>
          </div>
        </div>
      );
    }
    throw e;
  }
  if (!doc) return notFound();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Link href="/dashboard/documents" className="hover:text-orange-400">📂 Classeur</Link>
            <span>/</span>
            <Link href={`/dashboard/restaurants/${doc.restaurantId}/documents/historique`} className="hover:text-orange-400">
              {doc.restaurant?.name ?? "—"}
            </Link>
            <span>/</span>
            <span className="text-slate-200">{doc.number}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Créé le {new Date(doc.createdAt).toLocaleString("fr-FR")}
            {doc.createdBy && ` par ${doc.createdBy}`}
            {doc.signedAt && ` · ✓ Signé le ${new Date(doc.signedAt).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
      </div>

      <DocumentViewerClient
        doc={{
          id: doc.id,
          type: doc.type,
          number: doc.number,
          title: doc.title,
          vendor: doc.vendor,
          client: doc.client,
          data: doc.data,
          restaurantName: doc.restaurant?.name ?? "",
          signedAt: doc.signedAt?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
