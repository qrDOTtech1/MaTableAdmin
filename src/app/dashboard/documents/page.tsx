import { prisma } from "@/lib/db";
import DocumentsListClient from "./DocumentsListClient";
import ArchiveControlsClient from "./ArchiveControlsClient";

export const dynamic = "force-dynamic";

export default async function GlobalDocumentsPage() {
  const docs = await prisma.generatedDocument.findMany({
    include: { restaurant: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const cfg = await prisma.adminConfig.findUnique({ where: { id: "default" } });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📂 Classeur virtuel</h1>
          <p className="text-slate-400 text-sm mt-1">
            Tous les documents générés, tous restaurants confondus.
            {cfg?.lastArchiveSentAt && (
              <span className="ml-2 text-emerald-400">
                · Dernier envoi archive : {new Date(cfg.lastArchiveSentAt).toLocaleString("fr-FR")}
              </span>
            )}
          </p>
        </div>
        <ArchiveControlsClient
          initial={{
            archiveRecipient: cfg?.archiveRecipient ?? "",
            archiveEnabled: cfg?.archiveEnabled ?? false,
            archiveDayOfMonth: cfg?.archiveDayOfMonth ?? 1,
          }}
        />
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
          restaurantName: d.restaurant?.name ?? "—",
          restaurantId: d.restaurant?.id ?? "",
        }))}
      />
    </div>
  );
}
