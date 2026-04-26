"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveGlobalIaConfig(formData: FormData) {
  try {
    const ollamaApiKey      = (formData.get("ollamaApiKey")      as string)?.trim() || null;
    const ollamaLangModel   = (formData.get("ollamaLangModel")   as string)?.trim() || "gpt-oss:120b-cloud";
    const ollamaVisionModel = (formData.get("ollamaVisionModel") as string)?.trim() || "gpt-4o-cloud";

    console.log("[saveGlobalIaConfig] Received Ollama config:", {
      ollamaApiKey: ollamaApiKey ? "***" : null,
      ollamaLangModel,
      ollamaVisionModel
    });

    // If key field left empty, keep existing key
    if (ollamaApiKey === null) {
      console.log("[saveGlobalIaConfig] Updating models only (key remains unchanged)");
      await prisma.$executeRaw`
        INSERT INTO "GlobalConfig" (id, "ollamaLangModel", "ollamaVisionModel", "updatedAt")
        VALUES ('global', ${ollamaLangModel}, ${ollamaVisionModel}, NOW())
        ON CONFLICT (id) DO UPDATE
        SET "ollamaLangModel"   = EXCLUDED."ollamaLangModel",
            "ollamaVisionModel" = EXCLUDED."ollamaVisionModel",
            "updatedAt"     = NOW()
      `;
    } else {
      console.log("[saveGlobalIaConfig] Updating with new Ollama API key and models");
      await prisma.$executeRaw`
        INSERT INTO "GlobalConfig" (id, "ollamaApiKey", "ollamaLangModel", "ollamaVisionModel", "updatedAt")
        VALUES ('global', ${ollamaApiKey}, ${ollamaLangModel}, ${ollamaVisionModel}, NOW())
        ON CONFLICT (id) DO UPDATE
        SET "ollamaApiKey"      = EXCLUDED."ollamaApiKey",
            "ollamaLangModel"   = EXCLUDED."ollamaLangModel",
            "ollamaVisionModel" = EXCLUDED."ollamaVisionModel",
            "updatedAt"     = NOW()
      `;
    }
    console.log("[saveGlobalIaConfig] Database update successful");
    revalidatePath("/dashboard/settings");
    console.log("[saveGlobalIaConfig] Path revalidated");
  } catch (err: any) {
    console.error("[saveGlobalIaConfig] ERROR:", err);
    throw err;
  }
}

export async function revokeGlobalKey() {
  try {
    console.log("[revokeGlobalKey] Revoking Ollama API key");
    await prisma.$executeRaw`
      UPDATE "GlobalConfig" SET "ollamaApiKey" = NULL, "updatedAt" = NOW() WHERE id = 'global'
    `;
    console.log("[revokeGlobalKey] Key revoked successfully");
    revalidatePath("/dashboard/settings");
  } catch (err: any) {
    console.error("[revokeGlobalKey] ERROR:", err);
    throw err;
  }
}
