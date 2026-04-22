import { getSocialPrisma } from "@/lib/social-db";
import DeleteUserButton from "./DeleteUserButton";

export const dynamic = "force-dynamic";

async function getSocialData() {
  const socialPrisma = getSocialPrisma();
  if (!socialPrisma) return null;
  try {
    const [users, profiles, pings, restaurants, reservations] = await Promise.all([
      socialPrisma.user.findMany({
        include: { profile: true },
        orderBy: { id: "desc" },
        take: 100,
      }),
      socialPrisma.socialProfile.count(),
      socialPrisma.socialPing.groupBy({ by: ["status"], _count: true }),
      socialPrisma.restaurant.findMany({ orderBy: { createdAt: "desc" } }),
      socialPrisma.reservation.findMany({
        include: {
          user: { select: { name: true, email: true } },
          restaurant: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return { users, profiles, pings, restaurants, reservations };
  } catch {
    return null;
  }
}

const MODE_COLORS: Record<string, string> = {
  BUSINESS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DATE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  FUN: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  HIDDEN: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400",
  CONFIRMED: "bg-green-500/10 text-green-400",
  CANCELLED: "bg-red-500/10 text-red-400",
  DONE: "bg-slate-500/10 text-slate-400",
};

export default async function SocialUsersPage() {
  const data = await getSocialData();

  if (!data) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-4">Utilisateurs Ma Table RS</h1>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <p className="text-yellow-400 font-bold mb-2">⚠️ Variable manquante</p>
          <p className="text-slate-400 text-sm">
            Ajoutez <code className="bg-slate-800 px-2 py-0.5 rounded text-orange-400">SOCIAL_DATABASE_URL</code> dans les variables Railway de MaTableAdmin.
            <br />Valeur = la DATABASE_URL du service RSMATABLE.
          </p>
        </div>
      </div>
    );
  }

  const pingStats = Object.fromEntries(data.pings.map((p) => [p.status, p._count]));
  const onboardedCount = data.users.filter((u) => u.profile?.onboardingDone).length;

  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Utilisateurs Ma Table RS</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion des comptes, profils sociaux, réservations et restaurants partenaires.</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Utilisateurs total", value: data.users.length, color: "text-white" },
          { label: "Profils complétés", value: onboardedCount, color: "text-orange-400" },
          { label: "Pings envoyés", value: pingStats["SENT"] ?? 0, color: "text-blue-400" },
          { label: "Connexions créées", value: pingStats["ACCEPTED"] ?? 0, color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* USERS TABLE */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Comptes utilisateurs ({data.users.length})</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-widest">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Occupation</th>
                <th className="px-4 py-3">Centres d'intérêt</th>
                <th className="px-4 py-3">Onboarding</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                        {user.image
                          ? <img src={user.image} className="w-full h-full object-cover" />
                          : (user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()
                        }
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.name ?? "—"}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.profile?.activeMode ? (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${MODE_COLORS[user.profile.activeMode] ?? ""}`}>
                        {user.profile.activeMode}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{user.profile?.occupation ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(user.profile?.interests ?? []).slice(0, 4).map((i) => (
                        <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{i}</span>
                      ))}
                      {(user.profile?.interests?.length ?? 0) > 4 && (
                        <span className="text-[9px] text-slate-600">+{(user.profile!.interests.length) - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.profile?.onboardingDone
                      ? <span className="text-green-400 text-xs font-bold">✓ Complété</span>
                      : <span className="text-slate-600 text-xs">En attente</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {/* cuid has no timestamp, use profile.createdAt */}
                    {user.profile?.createdAt
                      ? new Date(user.profile.createdAt).toLocaleDateString("fr-FR")
                      : "—"
                    }
                  </td>
                  <td className="px-4 py-3">
                    <DeleteUserButton
                      userId={user.id}
                      userName={user.name ?? user.email ?? user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.users.length === 0 && (
            <div className="text-center py-12 text-slate-600">Aucun utilisateur pour l'instant.</div>
          )}
        </div>
      </section>

      {/* RESTAURANTS PARTENAIRES */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Restaurants partenaires ({data.restaurants.length})</h2>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-widest">
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Cuisine</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Réservations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.restaurants.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {r.logoUrl ? <img src={r.logoUrl} className="w-full h-full object-cover" /> : "🍽️"}
                      </div>
                      <div>
                        <div className="font-medium text-white">{r.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{r.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.city ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.cuisine ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.isPremium
                      ? <span className="text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">Premium</span>
                      : <span className="text-slate-600 text-xs">Standard</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {r.acceptsReservations
                      ? <span className="text-green-400 text-xs font-bold">✓ Actif</span>
                      : <span className="text-slate-600 text-xs">Désactivé</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.restaurants.length === 0 && (
            <div className="text-center py-12 text-slate-600">Aucun restaurant partenaire.</div>
          )}
        </div>
      </section>

      {/* RÉSERVATIONS */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Réservations récentes ({data.reservations.length})</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-widest">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Couverts</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white text-xs">{r.user.name ?? r.guestName ?? "—"}</div>
                    <div className="text-slate-500 text-[10px]">{r.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs font-medium">{r.restaurant.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {" "}
                    {new Date(r.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.partySize} pers.</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.reservations.length === 0 && (
            <div className="text-center py-12 text-slate-600">Aucune réservation.</div>
          )}
        </div>
      </section>
    </div>
  );
}
