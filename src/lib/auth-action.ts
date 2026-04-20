"use server";
import { login as libLogin, logout as libLogout } from "./auth";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  return await libLogin(formData);
}

export async function logout() {
  await libLogout();
  redirect("/login");
}
