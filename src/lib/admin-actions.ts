import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SubscriptionPlan } from "@prisma/client";
import crypto from "crypto";

export async function updateRestaurant(id: string, formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  await prisma.restaurant.update({
    where: { id },
    data: { name, slug: slug || null },
  });

  revalidatePath(`/dashboard/restaurants/${id}`);
  revalidatePath("/dashboard");
}

export async function updateSubscription(id: string, formData: FormData) {
  "use server";
  const subscription = formData.get("subscription") as SubscriptionPlan;

  const current = await prisma.restaurant.findUnique({
    where: { id },
    select: { subscription: true, ollamaApiKey: true },
  });

  // Auto-génère une clé si upgrade vers PRO_IA sans clé existante
  const needsNewKey = subscription === "PRO_IA" && !current?.ollamaApiKey;
  const ollamaApiKey = needsNewKey
    ? `nova_${crypto.randomBytes(24).toString("hex")}`
    : undefined;

  await prisma.restaurant.update({
    where: { id },
    data: {
      subscription,
      subscriptionStartedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ...(ollamaApiKey ? { ollamaApiKey } : {}),
    },
  });

  revalidatePath(`/dashboard/restaurants/${id}`);
  revalidatePath("/dashboard");
}

export async function regenerateOllamaKey(id: string) {
  "use server";
  const newKey = `nova_${crypto.randomBytes(24).toString("hex")}`;
  await prisma.restaurant.update({
    where: { id },
    data: { ollamaApiKey: newKey },
  });
  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function revokeOllamaKey(id: string) {
  "use server";
  await prisma.restaurant.update({
    where: { id },
    data: { ollamaApiKey: null },
  });
  revalidatePath(`/dashboard/restaurants/${id}`);
}

export async function deleteRestaurant(id: string) {
  "use server";
  await prisma.restaurant.delete({ where: { id } });
  revalidatePath("/dashboard");
}
