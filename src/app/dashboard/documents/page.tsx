import { prisma } from "@/lib/db";
import DocumentsListClient from "./DocumentsListClient";
import ArchiveControlsClient from "./ArchiveControlsClient";

export const dynamic = "force-dynamic";

export default async function GlobalDocumentsPage() {
  // Garde anti-crash : si les tables n'ont pas encore été créées en DB
  // (migration non appliquée), on affiche une page utile au lieu d'un 500.
  let docs: any[] = [];
  let cfg: any = null;
  let migrationPending = false;
  try {
    docs = await prisma.generatedDocument.findMany({
      include: { restaurant: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    cfg = await prisma.adminConfig.findUnique({ where: { id: "default" } });
  } catch (e: any) {
    if (e?.code === "P2021") {
      migrationPending = true;
    } else {
      throw e;
    }
  }

  if (migrationPending) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-200">
          <h1 className="text-xl font-bold mb-2">⚠ Migration DB en attente</h1>
          <p className="text-sm mb-4">
            Les tables <code className="text-amber-400">GeneratedDocument</code> et
            <code className="text-amber-400"> AdminConfig</code> n'existent pas encore en base.
          </p>
          <p className="text-sm mb-2">Appliquer le SQL fourni :</p>
          <pre className="bg-black/40 p-3 rounded-lg text-xs font-mono text-amber-100 overflow-x-auto">
{`psql $DATABASE_URL -f prisma/migrations/add_documents_and_config.sql`}
          </pre>
          <p className="text-xs text-amber-300 mt-3 italic">
            (ou copier-coller le fichier SQL dans la console DB Railway / Neon / Supabase).
          </p>
        </div>
      </div>
    );
  }

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
