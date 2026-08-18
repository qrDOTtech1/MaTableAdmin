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

  // Fan out all counts + db size in parallel — each table's failure is isolated
  const countPromises = TABLES.map((t) =>
    prisma
      .$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM "${t}"`)
      .then((rows) => [t, Number(rows[0]?.count ?? 0)] as const)
      .catch(() => [t, null] as const)
  );
  const sizePromise = prisma
    .$queryRawUnsafe<Array<{ size: bigint }>>(`SELECT pg_database_size(current_database())::bigint AS size`)
    .then((r) => Number(r[0]?.size ?? 0))
    .catch(() => null as number | null);

  const [countEntries, dbSizeBytes] = await Promise.all([Promise.all(countPromises), sizePromise]);
  const counts: Record<string, number | null> = Object.fromEntries(countEntries);

  return NextResponse.json({ counts, dbSizeBytes, at: new Date().toISOString() });
}
