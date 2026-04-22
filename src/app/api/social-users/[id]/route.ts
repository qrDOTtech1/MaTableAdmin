import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSocialPrisma } from "@/lib/social-db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin must be authenticated
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const socialPrisma = getSocialPrisma();
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
    // Delete in correct order to respect FK constraints
    await socialPrisma.$transaction(async (tx) => {
      // Get profile id for socialPing queries
      const profile = await tx.socialProfile.findUnique({ where: { userId: id }, select: { id: true } });

      if (profile) {
        // Social pings reference profile id
        await tx.socialPing.deleteMany({
          where: { OR: [{ senderId: profile.id }, { receiverId: profile.id }] },
        });
        // Social connections reference profile id
        await tx.socialConnection.deleteMany({
          where: { OR: [{ requesterId: profile.id }, { receiverId: profile.id }] },
        });
      }

      // Reviews, favorites, reservations reference userId directly
      await tx.dishReview.deleteMany({ where: { userId: id } });
      await tx.favoriteRestaurant.deleteMany({ where: { userId: id } });
      await tx.reservation.deleteMany({ where: { userId: id } });

      // Auth data
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.account.deleteMany({ where: { userId: id } });

      // Profile
      if (profile) {
        await tx.socialProfile.delete({ where: { id: profile.id } });
      }

      // Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Delete social user error:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression : " + err.message }, { status: 500 });
  }
}
