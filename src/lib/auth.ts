import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-admin-matable";
const ADMIN_CREDENTIALS = process.env.ADMIN_CREDENTIALS || "admin:admin1234";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const admins = ADMIN_CREDENTIALS.split(",").map(pair => pair.trim().split(":"));
  const isValid = admins.some(([u, p]) => u && p && u === username && p === password);

  if (!isValid) return false;

  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(JWT_SECRET));

  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return payload;
  } catch (err) {
    return null;
  }
}
