/**
 * GET /api/database/stats
 * Compte les lignes des tables critiques. Sert au tableau de bord
 * et à détecter si une perte de données est survenue.
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TABLES = [
  "Restaurant", "MenuItem", "User", "Server", "Table", "TableSession", "Order",
  "CustomerReview", "Prospect", "PricingRequest",
  "GeneratedDocument", "AdminConfig", "GlobalConfig",
  "Reservation", "ServiceCall", "DishReview", "ServerReview", "ZoneConfig",
];

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const countTasks = TABLES.map(async (t): Promise<[string, number | null]> => {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${t}"`
      );
      return [t, Number(rows[0]?.count ?? 0)];
    } catch {
      return [t, null];
    }
  });

  // DB size (Postgres) — runs in parallel with the per-table counts
  const dbSizeTask = prisma
    .$queryRawUnsafe<Array<{ size: bigint }>>(
      `SELECT pg_database_size(current_database())::bigint AS size`
    )
    .then((r) => Number(r[0]?.size ?? 0))
    .catch((): number | null => null);

  const [countPairs, dbSizeBytes] = await Promise.all([Promise.all(countTasks), dbSizeTask]);
  const counts: Record<string, number | null> = Object.fromEntries(countPairs);

  return NextResponse.json({ counts, dbSizeBytes, at: new Date().toISOString() });
}
