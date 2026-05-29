import { prisma } from "@/lib/db";
import { CampaignForm } from "./CampaignForm";

export const dynamic = "force-dynamic";

type Log = { id: string; segment: string; subject: string; sentCount: number; failCount: number; sentAt: Date };

const SEGMENT_LABEL: Record<string, string> = {
  all: "Tous les restos",
  trial_active: "Essai actif",
  trial_expired: "Essai expiré (non converti)",
  converted: "Restos payants",
  inactive_14d: "Inactifs > 14 jours",
  no_menu: "Sans menu créé",
};

export default async function CampagnesPage() {
  let logs: Log[] = [];
  try {
    logs = await prisma.$queryRawUnsafe<Log[]>(
      `SELECT id, segment, subject, "sentCount", "failCount", "sentAt"
         FROM "CampaignLog"
        ORDER BY "sentAt" DESC
        LIMIT 100`
    );
  } catch {
    logs = [];
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Campagnes email</h1>
        <p className="text-slate-400">
          Envoyez un message à un segment de restos en un clic.
          Placeholders disponibles : <code className="text-orange-300">{"{name}"}</code> = nom du resto.
        </p>
      </div>

      <CampaignForm segmentLabels={SEGMENT_LABEL} />

      <div>
        <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-3">Historique d'envois</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3 text-right">Envoyés</th>
                <th className="px-4 py-3 text-right">Échecs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Aucune campagne encore. Lancez votre première au-dessus.
                </td></tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-400">{new Date(l.sentAt).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{SEGMENT_LABEL[l.segment] ?? l.segment}</span></td>
                  <td className="px-4 py-3 text-white/80">{l.subject}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{l.sentCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-400">{l.failCount || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
