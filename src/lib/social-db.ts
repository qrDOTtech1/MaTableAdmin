import { PrismaClient } from ".prisma/social-client";

const globalForSocial = globalThis as unknown as { socialPrisma?: PrismaClient };

export function getSocialPrisma(): PrismaClient | null {
  if (!process.env.SOCIAL_DATABASE_URL) return null;
  if (globalForSocial.socialPrisma) return globalForSocial.socialPrisma;
  const client = new PrismaClient({
    datasources: { db: { url: process.env.SOCIAL_DATABASE_URL } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") globalForSocial.socialPrisma = client;
  return client;
}
