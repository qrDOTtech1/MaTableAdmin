"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveGlobalIaConfig(formData: FormData) {
  const iaApiKey      = (formData.get("iaApiKey")      as string)?.trim() || null;
  const iaLangModel   = (formData.get("iaLangModel")   as string)?.trim() || "gpt-4o-mini";
  const iaVisionModel = (formData.get("iaVisionModel") as string)?.trim() || "gpt-4o";

  // If key field left empty, keep existing key
  if (iaApiKey === null) {
    await prisma.$executeRaw`
      INSERT INTO "GlobalConfig" (id, "iaLangModel", "iaVisionModel", "updatedAt")
      VALUES ('global', ${iaLangModel}, ${iaVisionModel}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET "iaLangModel"   = EXCLUDED."iaLangModel",
          "iaVisionModel" = EXCLUDED."iaVisionModel",
          "updatedAt"     = NOW()
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "GlobalConfig" (id, "iaApiKey", "iaLangModel", "iaVisionModel", "updatedAt")
      VALUES ('global', ${iaApiKey}, ${iaLangModel}, ${iaVisionModel}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET "iaApiKey"      = EXCLUDED."iaApiKey",
          "iaLangModel"   = EXCLUDED."iaLangModel",
          "iaVisionModel" = EXCLUDED."iaVisionModel",
          "updatedAt"     = NOW()
    `;
  }
  revalidatePath("/dashboard/settings");
}

export async function revokeGlobalKey() {
  await prisma.$executeRaw`
    UPDATE "GlobalConfig" SET "iaApiKey" = NULL, "updatedAt" = NOW() WHERE id = 'global'
  `;
  revalidatePath("/dashboard/settings");
}
