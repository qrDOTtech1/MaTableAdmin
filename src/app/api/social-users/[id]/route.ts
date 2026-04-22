import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getSocialPrisma } from "@/lib/social-db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin must be authenticated
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socialPrisma = getSocialPrisma() as any;
  if (!socialPrisma) {
    return NextResponse.json({ error: "Base de données sociale non configurée." }, { status: 503 });
  }

  const { id } = params;

  // Verify user exists
  const user = await socialPrisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await socialPrisma.$transaction(async (tx: any) => {
      // Get profile for relation-based deletes
      const profile = await tx.socialProfile.findUnique({ where: { userId: id }, select: { id: true } });

      if (profile) {
        await tx.socialPing.deleteMany({
          where: { OR: [{ senderId: profile.id }, { receiverId: profile.id }] },
        });
      }

      await tx.dishReview.deleteMany({ where: { userId: id } });
      await tx.favoriteRestaurant.deleteMany({ where: { userId: id } });
      await tx.reservation.deleteMany({ where: { userId: id } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.account.deleteMany({ where: { userId: id } });

      if (profile) {
        await tx.socialProfile.delete({ where: { id: profile.id } });
      }

      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Delete social user error:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression : " + message }, { status: 500 });
  }
}
