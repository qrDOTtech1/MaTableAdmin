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

  // Fire all COUNTs (+ DB size) concurrently — each is independent.
  // 19 sequential queries → 20 parallel queries: reduces wall-clock from
  // ~20×RTT to ~1×RTT for the tableau de bord.
  const countPromises = TABLES.map((t) =>
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${t}"`,
    )
      .then((rows) => [t, Number(rows[0]?.count ?? 0)] as const)
      .catch(() => [t, null] as const),
  );
  const dbSizePromise = prisma
    .$queryRawUnsafe<Array<{ size: bigint }>>(
      `SELECT pg_database_size(current_database())::bigint AS size`,
    )
    .then((r) => Number(r[0]?.size ?? 0))
    .catch(() => null);

  const [countEntries, dbSizeBytes] = await Promise.all([
    Promise.all(countPromises),
    dbSizePromise,
  ]);

  const counts: Record<string, number | null> = Object.fromEntries(countEntries);
  return NextResponse.json({ counts, dbSizeBytes, at: new Date().toISOString() });
}
