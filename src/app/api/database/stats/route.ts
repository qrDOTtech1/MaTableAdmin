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

  // Fan-out : les COUNT sont indépendants → toutes les tables en parallèle,
  // + pg_database_size dans la même vague. Latence ≈ 1 round-trip au lieu de N+1.
  const countPromises = TABLES.map(async (t) => {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${t}"`
      );
      return [t, Number(rows[0]?.count ?? 0)] as const;
    } catch {
      return [t, null] as const;  // table absente
    }
  });
  const sizePromise = (async (): Promise<number | null> => {
    try {
      const r = await prisma.$queryRawUnsafe<Array<{ size: bigint }>>(
        `SELECT pg_database_size(current_database())::bigint AS size`
      );
      return Number(r[0]?.size ?? 0);
    } catch { return null; }
  })();

  const [countEntries, dbSizeBytes] = await Promise.all([Promise.all(countPromises), sizePromise]);
  const counts: Record<string, number | null> = Object.fromEntries(countEntries);

  return NextResponse.json({ counts, dbSizeBytes, at: new Date().toISOString() });
}
