import { PrismaClient } from ".prisma/social-client";

const globalForSocial = globalThis as unknown as { socialPrisma?: PrismaClient };

export const socialPrisma =
  globalForSocial.socialPrisma ??
  new PrismaClient({
    datasources: { db: { url: process.env.SOCIAL_DATABASE_URL } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForSocial.socialPrisma = socialPrisma;
}
