import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Récupérer les emails reçus
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const toFilter = url.searchParams.get("to");

  try {
    const where: any = {};
    if (toFilter && toFilter !== "all") {
      where.to = { contains: toFilter, mode: "insensitive" };
    }

    const emails = await prisma.receivedEmail.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ emails });
  } catch (e: any) {
    console.error("[list inbound emails]", e?.message);
    return NextResponse.json({ emails: [], error: e?.message }, { status: 500 });
  }
}
