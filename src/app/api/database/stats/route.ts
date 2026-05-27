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

  const counts: Record<string, number | null> = {};
  for (const t of TABLES) {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${t}"`
      );
      counts[t] = Number(rows[0]?.count ?? 0);
    } catch {
      counts[t] = null;  // table absente
    }
  }

  // DB size (Postgres)
  let dbSizeBytes: number | null = null;
  try {
    const r = await prisma.$queryRawUnsafe<Array<{ size: bigint }>>(
      `SELECT pg_database_size(current_database())::bigint AS size`
    );
    dbSizeBytes = Number(r[0]?.size ?? 0);
  } catch {}

  return NextResponse.json({ counts, dbSizeBytes, at: new Date().toISOString() });
}
