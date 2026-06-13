import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/prospects?status=&city=&search=&page=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "30"));

  const where: any = {};
  if (status) where.status = status;
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  // Parallelize 4 independent queries — was: 2 in Promise.all + 2 sequential after.
  const [total, prospects, stats, cities] = await Promise.all([
    (prisma as any).prospect.count({ where }),
    (prisma as any).prospect.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma as any).prospect.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    // Bound the city dropdown — distinct over an unbounded prospect table can blow up
    (prisma as any).prospect.findMany({
      where: { city: { not: null } },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
      take: 500,
    }),
  ]);

  const statMap: Record<string, number> = {};
  for (const s of stats) statMap[s.status] = s._count._all;

  return NextResponse.json({
    prospects,
    total,
    pages: Math.ceil(total / limit),
    page,
    stats: {
      NEW: statMap["NEW"] ?? 0,
      CONTACTED: statMap["CONTACTED"] ?? 0,
      ACTIVATED: statMap["ACTIVATED"] ?? 0,
      IGNORED: statMap["IGNORED"] ?? 0,
    },
    cities: cities.map((c: any) => c.city).filter(Boolean),
  });
}
