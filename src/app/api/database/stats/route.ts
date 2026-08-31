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

  // Fan all per-table COUNTs (plus the db-size query) out in parallel — each one was
  // previously waiting for the previous round-trip before issuing its own.
  const countResults = await Promise.all(
    TABLES.map((t) =>
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${t}"`
      )
        .then((rows) => Number(rows[0]?.count ?? 0))
        .catch(() => null as number | null)
    )
  );
  const counts: Record<string, number | null> = {};
  TABLES.forEach((t, i) => { counts[t] = countResults[i]; });

  const dbSizeBytes = await prisma.$queryRawUnsafe<Array<{ size: bigint }>>(
    `SELECT pg_database_size(current_database())::bigint AS size`
  )
    .then((r) => Number(r[0]?.size ?? 0))
    .catch(() => null as number | null);

  return NextResponse.json({ counts, dbSizeBytes, at: new Date().toISOString() });
}
