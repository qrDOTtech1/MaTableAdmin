const DEV_JWT_FALLBACK = "fallback-secret-for-admin-matable";
const DEV_CREDENTIALS_FALLBACK = "admin:admin1234";

const isProd = process.env.NODE_ENV === "production";

function readSecret(name: string, devFallback: string): string {
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value && value !== devFallback) return value;

  if (isProd) {
    throw new Error(
      `[admin] ${name} must be set to a non-default value in production. ` +
        `Refusing to boot with the well-known dev fallback.`,
    );
  }

  if (typeof console !== "undefined") {
    console.warn(
      `[admin] ${name} is using the built-in dev fallback. ` +
        `Set ${name} in your environment for anything other than local dev.`,
    );
  }
  return devFallback;
}

export const JWT_SECRET = readSecret("JWT_SECRET", DEV_JWT_FALLBACK);
export const ADMIN_CREDENTIALS = readSecret(
  "ADMIN_CREDENTIALS",
  DEV_CREDENTIALS_FALLBACK,
);
