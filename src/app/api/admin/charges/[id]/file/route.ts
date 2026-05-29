/**
 * /api/admin/charges/[id]/file — télécharge le fichier d'une charge
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await prisma.$queryRawUnsafe<Array<{ fileName: string | null; fileMime: string | null; fileData: string | null }>>(
    `SELECT "fileName", "fileMime", "fileData" FROM "SupplierInvoice" WHERE id = $1`, id,
  );
  const row = rows[0];
  if (!row?.fileData) return NextResponse.json({ error: "no_file" }, { status: 404 });

  const buf = Buffer.from(row.fileData, "base64");
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": row.fileMime ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${row.fileName ?? "facture"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
