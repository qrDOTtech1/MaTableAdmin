import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmailClient from "./EmailClient";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  return <EmailClient />;
}
