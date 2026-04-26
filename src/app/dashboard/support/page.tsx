import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

type Ticket = {
  id: string; restaurantId: string; userId: string | null;
  subject: string; message: string; status: string; priority: string;
  adminReply: string | null; repliedAt: Date | null; createdAt: Date; updatedAt: Date;
  restaurantName?: string;
};

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OPEN:    { label: "Ouvert",  bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30" },
  REPLIED: { label: "Repondu", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  CLOSED:  { label: "Ferme",   bg: "bg-slate-800",      text: "text-slate-400",   border: "border-slate-700" },
};

const PRIORITY_STYLE: Record<string, { label: string; cls: string }> = {
  LOW:    { label: "Faible", cls: "text-slate-500" },
  NORMAL: { label: "Normal", cls: "text-slate-300" },
  URGENT: { label: "Urgent", cls: "text-red-400 font-bold" },
};

async function replyToTicket(formData: FormData) {
  "use server";
  const ticketId = formData.get("ticketId") as string;
  const adminReply = (formData.get("adminReply") as string)?.trim();
  const action = formData.get("action") as string;

  if (action === "close") {
    await prisma.$executeRaw`
      UPDATE "SupportTicket" SET status = 'CLOSED', "updatedAt" = NOW() WHERE id = ${ticketId}
    `;
  } else if (adminReply) {
    await prisma.$executeRaw`
      UPDATE "SupportTicket"
      SET "adminReply" = ${adminReply}, "repliedAt" = NOW(), status = 'REPLIED', "updatedAt" = NOW()
      WHERE id = ${ticketId}
    `;
  }
  revalidatePath("/dashboard/support");
}

export default async function AdminSupportPage() {
  const tickets = await prisma.$queryRaw<Ticket[]>`
    SELECT t.*, r.name AS "restaurantName"
    FROM "SupportTicket" t
    LEFT JOIN "Restaurant" r ON r.id = t."restaurantId"
    ORDER BY
      CASE t.status WHEN 'OPEN' THEN 0 WHEN 'REPLIED' THEN 1 ELSE 2 END,
      CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END,
      t."createdAt" DESC
    LIMIT 100
  `;

  const openCount = tickets.filter(t => t.status === "OPEN").length;
  const urgentCount = tickets.filter(t => t.priority === "URGENT" && t.status === "OPEN").length;

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">🎧</span> SAV / Support
          </h1>
          <p className="text-slate-400 mt-1">Messages des restaurateurs</p>
        </div>
        <div className="flex gap-3">
          {urgentCount > 0 && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
              <span className="text-red-400 font-bold text-sm">{urgentCount} urgent{urgentCount > 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <span className="text-amber-400 font-bold text-sm">{openCount} ouvert{openCount > 1 ? "s" : ""}</span>
          </div>
          <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl">
            <span className="text-slate-300 text-sm">{tickets.length} total</span>
          </div>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-5xl mb-4">🎧</div>
          <p className="text-lg">Aucun ticket pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(t => {
            const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.OPEN;
            const p = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.NORMAL;
            return (
              <div key={t.id} className={`${s.bg} border ${s.border} rounded-2xl p-5 space-y-3`}>
                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
                    <span className={`text-xs ${p.cls}`}>{p.label}</span>
                    <span className="text-xs text-slate-500 font-mono">{(t as any).restaurantName ?? t.restaurantId}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-white font-bold">{t.subject}</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.message}</p>

                {/* Admin reply if exists */}
                {t.adminReply && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-xs text-emerald-400 font-bold mb-1">Votre reponse :</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.adminReply}</p>
                    {t.repliedAt && (
                      <p className="text-xs text-slate-500 mt-2">{new Date(t.repliedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    )}
                  </div>
                )}

                {/* Reply form */}
                {t.status !== "CLOSED" && (
                  <form action={replyToTicket} className="flex gap-2 items-end pt-2 border-t border-slate-800">
                    <input type="hidden" name="ticketId" value={t.id} />
                    <textarea name="adminReply" rows={2} placeholder="Votre reponse..."
                      defaultValue={t.adminReply ?? ""}
                      className="flex-1 bg-black/30 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500 resize-none"
                    />
                    <div className="flex flex-col gap-1">
                      <button type="submit" name="action" value="reply"
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors">
                        Repondre
                      </button>
                      <button type="submit" name="action" value="close"
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-colors">
                        Fermer
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
