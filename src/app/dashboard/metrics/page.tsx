import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ── Tarifs mensuels HT par forfait (€) ──────────────────────────────────────
const PLAN_PRICE: Record<string, number> = { STARTER: 59, PRO: 119, PRO_IA: 249 };
const PLAN_LABEL: Record<string, string> = { STARTER: "Starter", PRO: "Pro", PRO_IA: "Business" };
const PLAN_COLOR: Record<string, string> = { STARTER: "text-blue-400", PRO: "text-orange-400", PRO_IA: "text-purple-400" };
const PLAN_BG: Record<string, string> = { STARTER: "bg-blue-500", PRO: "bg-orange-500", PRO_IA: "bg-purple-500" };

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

type Resto = {
  id: string;
  name: string;
  subscription: string;
  subscriptionStartedAt: Date | null;
  subscriptionExpiresAt: Date | null;
  createdAt: Date;
};

function eur(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function MetricsPage() {
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 86400_000);
  const ago30 = new Date(now.getTime() - 30 * 86400_000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const restos = (await prisma.restaurant.findMany({
    select: {
      id: true, name: true, subscription: true,
      subscriptionStartedAt: true, subscriptionExpiresAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })) as Resto[];

  // Journal d'abonnements (historisé) — tolère l'absence de table avant migration
  type SubEvent = { type: string; plan: string; mrrCents: number; mrrDeltaCents: number; createdAt: Date; restaurantName: string | null };
  let events: SubEvent[] = [];
  try {
    events = await prisma.$queryRawUnsafe<SubEvent[]>(
      `SELECT type, plan, "mrrCents", "mrrDeltaCents", "createdAt", "restaurantName"
       FROM "SubscriptionEvent" ORDER BY "createdAt" DESC LIMIT 2000`
    );
  } catch { events = []; }
  const hasEvents = events.length > 0;

  // ── Classification ────────────────────────────────────────────────────────
  const active: Resto[] = [];        // abonnement payant en cours
  const expired: Resto[] = [];       // abonnement échu (churn potentiel)
  const neverPaid: Resto[] = [];     // jamais abonné / essai

  for (const r of restos) {
    const exp = r.subscriptionExpiresAt ? new Date(r.subscriptionExpiresAt) : null;
    if (!exp) neverPaid.push(r);
    else if (exp >= now) active.push(r);
    else expired.push(r);
  }

  // ── MRR / ARR ───────────────────────────────────────────────────────────────
  const mrr = active.reduce((s, r) => s + (PLAN_PRICE[r.subscription] ?? 0), 0);
  const arr = mrr * 12;
  const arpa = active.length ? mrr / active.length : 0;

  // Répartition par forfait (actifs)
  const byPlan: Record<string, { count: number; mrr: number }> = {};
  for (const r of active) {
    const p = r.subscription;
    (byPlan[p] ||= { count: 0, mrr: 0 });
    byPlan[p].count++;
    byPlan[p].mrr += PLAN_PRICE[p] ?? 0;
  }

  // ── Churn (30 derniers jours) ────────────────────────────────────────────────
  const churned30 = expired
    .filter((r) => r.subscriptionExpiresAt && new Date(r.subscriptionExpiresAt) >= ago30)
    .sort((a, b) => +new Date(b.subscriptionExpiresAt!) - +new Date(a.subscriptionExpiresAt!));
  const activeAtStart = active.length + churned30.length; // base pour le taux
  const churnRate = activeAtStart ? (churned30.length / activeAtStart) * 100 : 0;
  const mrrLost30 = churned30.reduce((s, r) => s + (PLAN_PRICE[r.subscription] ?? 0), 0);

  // À renouveler sous 7 jours (anticiper le churn)
  const expiringSoon = active
    .filter((r) => r.subscriptionExpiresAt && new Date(r.subscriptionExpiresAt) <= in7d)
    .sort((a, b) => +new Date(a.subscriptionExpiresAt!) - +new Date(b.subscriptionExpiresAt!));

  // Nouveaux ce mois
  const newThisMonth = restos.filter((r) => new Date(r.createdAt) >= startOfMonth).length;
  const paidThisMonth = restos.filter(
    (r) => r.subscriptionStartedAt && new Date(r.subscriptionStartedAt) >= startOfMonth
  ).length;

  // ── Évolution 12 mois : nouveaux abonnements payants + MRR ajouté ──────────────
  const months: { key: string; label: string; signups: number; newMrr: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: MONTHS_FR[d.getMonth()], signups: 0, newMrr: 0 });
  }
  const monthIdx = new Map(months.map((m, i) => [m.key, i]));
  for (const r of restos) {
    if (!r.subscriptionStartedAt) continue;
    const k = monthKey(new Date(r.subscriptionStartedAt));
    const idx = monthIdx.get(k);
    if (idx === undefined) continue;
    months[idx].signups++;
    months[idx].newMrr += PLAN_PRICE[r.subscription] ?? 0;
  }
  const maxMrr = Math.max(1, ...months.map((m) => m.newMrr));

  // ── Mouvements MRR RÉELS (depuis le journal d'événements) ──────────────────
  const evMonths: { key: string; label: string; net: number; gained: number; lost: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    evMonths.push({ key: monthKey(d), label: MONTHS_FR[d.getMonth()], net: 0, gained: 0, lost: 0 });
  }
  const evIdx = new Map(evMonths.map((m, i) => [m.key, i]));
  for (const e of events) {
    const idx = evIdx.get(monthKey(new Date(e.createdAt)));
    if (idx === undefined) continue;
    evMonths[idx].net += e.mrrDeltaCents;
    if (e.mrrDeltaCents >= 0) evMonths[idx].gained += e.mrrDeltaCents;
    else evMonths[idx].lost += e.mrrDeltaCents;
  }
  const evMax = Math.max(1, ...evMonths.map((m) => Math.max(m.gained, Math.abs(m.lost))));
  // Churn réel 30j (événements canceled)
  const canceledEvents30 = events.filter((e) => e.type === "canceled" && new Date(e.createdAt) >= ago30);
  const realChurnCount = canceledEvents30.length;
  const realMrrLost30 = canceledEvents30.reduce((s, e) => s + Math.abs(e.mrrDeltaCents), 0) / 100;

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Churn &amp; Revenus</h1>
        <p className="text-slate-400">Suivi MRR, ARR et rétention des abonnements MaTable.Pro</p>
      </div>

      {/* ── KPI principaux ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Kpi title="MRR (récurrent / mois)" value={eur(mrr)} icon="💰" color="text-emerald-500" />
        <Kpi title="ARR (annualisé)" value={eur(arr)} icon="📈" color="text-orange-500" />
        <Kpi title="Abonnés actifs" value={String(active.length)} icon="✅" color="text-blue-400" />
        <Kpi title="Taux de churn (30j)" value={churnRate.toFixed(1) + " %"} icon="📉" color={churnRate > 5 ? "text-red-400" : "text-emerald-500"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Kpi title="Revenu moyen / client (ARPA)" value={eur(arpa)} icon="🎯" color="text-purple-400" />
        <Kpi title="MRR perdu (30j)" value={eur(mrrLost30)} icon="🩸" color="text-red-400" />
        <Kpi title="Nouveaux restos (ce mois)" value={String(newThisMonth)} icon="🆕" color="text-emerald-500" />
        <Kpi title="Échus / essais" value={`${expired.length} / ${neverPaid.length}`} icon="⏳" color="text-slate-300" />
      </div>

      {/* ── Répartition par forfait + évolution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Répartition forfaits */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">MRR par forfait</h2>
          {Object.keys(byPlan).length === 0 && <p className="text-slate-500 text-sm">Aucun abonné actif.</p>}
          <div className="space-y-4">
            {(["STARTER", "PRO", "PRO_IA"] as const).map((p) => {
              const d = byPlan[p];
              if (!d) return null;
              const pct = mrr ? Math.round((d.mrr / mrr) * 100) : 0;
              return (
                <div key={p}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`font-semibold ${PLAN_COLOR[p]}`}>{PLAN_LABEL[p]}</span>
                    <span className="text-slate-300">{eur(d.mrr)} · {d.count} resto{d.count > 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${PLAN_BG[p]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Évolution 12 mois */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Nouveaux abonnements (MRR ajouté / 12 mois)</h2>
            <span className="text-xs text-slate-500">{paidThisMonth} ce mois</span>
          </div>
          <div className="flex items-end justify-between gap-1.5 h-40">
            {months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 transition-colors relative"
                    style={{ height: `${Math.max(2, (m.newMrr / maxMrr) * 100)}%` }}
                    title={`${m.label} : +${eur(m.newMrr)} · ${m.signups} abo`}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {eur(m.newMrr)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mouvements MRR RÉELS (journal d'abonnements) ── */}
      {hasEvents ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold">Mouvements MRR réels (12 mois)</h2>
            <span className="text-xs text-slate-500">{realChurnCount} churn / 30j · −{eur(realMrrLost30)}</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Gains (vert) vs pertes (rouge) par mois, depuis le journal d'abonnements.</p>
          <div className="flex items-stretch justify-between gap-1.5 h-44">
            {evMonths.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group">
                {/* gains au-dessus de l'axe */}
                <div className="w-full flex-1 flex items-end">
                  <div className="w-full rounded-t bg-emerald-500/70 group-hover:bg-emerald-400 transition-colors"
                       style={{ height: `${(m.gained / evMax) * 100}%` }}
                       title={`${m.label} : +${eur(m.gained / 100)}`} />
                </div>
                {/* pertes en dessous */}
                <div className="w-full flex-1 flex items-start">
                  <div className="w-full rounded-b bg-red-500/60 group-hover:bg-red-400 transition-colors"
                       style={{ height: `${(Math.abs(m.lost) / evMax) * 100}%` }}
                       title={`${m.label} : ${eur(m.lost / 100)}`} />
                </div>
                <span className="text-[10px] text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-400">
          <p className="font-semibold text-slate-300 mb-1">📊 Journal d'abonnements vide</p>
          <p>Les mouvements MRR réels (gains/pertes historisés, churn exact) s'afficheront ici dès qu'un forfait sera modifié ou résilié. Lance d'abord la migration <code className="text-orange-400">create_subscription_event</code> via Base de données.</p>
        </div>
      )}

      {/* ── À renouveler bientôt (anti-churn) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold">⚠️ À renouveler sous 7 jours</h2>
          <span className="text-sm text-slate-400">{expiringSoon.length} resto{expiringSoon.length > 1 ? "s" : ""}</span>
        </div>
        {expiringSoon.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm">Aucun abonnement n'expire dans les 7 prochains jours. 🎉</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Restaurant</th>
                <th className="px-6 py-3">Forfait</th>
                <th className="px-6 py-3">MRR</th>
                <th className="px-6 py-3">Expire le</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {expiringSoon.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium">{r.name}</td>
                  <td className={`px-6 py-3 font-semibold ${PLAN_COLOR[r.subscription] ?? "text-slate-300"}`}>{PLAN_LABEL[r.subscription] ?? r.subscription}</td>
                  <td className="px-6 py-3">{eur(PLAN_PRICE[r.subscription] ?? 0)}</td>
                  <td className="px-6 py-3 text-amber-400">{new Date(r.subscriptionExpiresAt!).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-3 text-right">
                    <a href={`/dashboard/restaurants/${r.id}`} className="text-orange-400 hover:underline">Gérer →</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Churn récent (30j) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold">📉 Churn récent (30 derniers jours)</h2>
          <span className="text-sm text-red-400">−{eur(mrrLost30)} MRR</span>
        </div>
        {churned30.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm">Aucun abonnement échu sur les 30 derniers jours. 👏</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Restaurant</th>
                <th className="px-6 py-3">Dernier forfait</th>
                <th className="px-6 py-3">MRR perdu</th>
                <th className="px-6 py-3">Échu le</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {churned30.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium">{r.name}</td>
                  <td className={`px-6 py-3 font-semibold ${PLAN_COLOR[r.subscription] ?? "text-slate-300"}`}>{PLAN_LABEL[r.subscription] ?? r.subscription}</td>
                  <td className="px-6 py-3 text-red-400">−{eur(PLAN_PRICE[r.subscription] ?? 0)}</td>
                  <td className="px-6 py-3 text-slate-400">{new Date(r.subscriptionExpiresAt!).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-3 text-right">
                    <a href={`/dashboard/restaurants/${r.id}`} className="text-orange-400 hover:underline">Réactiver →</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-600">
        MRR basé sur les tarifs HT (Starter 59€ · Pro 119€ · Business 249€) et le statut d'abonnement
        (<code>subscriptionExpiresAt</code>). Un abonnement est « actif » tant que sa date d'expiration est dans le futur.
      </p>
    </div>
  );
}

function Kpi({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-xs font-medium text-slate-400">{title}</div>
      <div className={`text-2xl sm:text-3xl font-black mt-1 ${color}`}>{value}</div>
    </div>
  );
}
