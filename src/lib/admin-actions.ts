import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

export async function deleteRestaurant(id: string) {
  "use server";
  await prisma.restaurant.delete({ where: { id } });
  revalidatePath("/dashboard");
}
