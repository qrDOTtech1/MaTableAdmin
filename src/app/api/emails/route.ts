import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY non configure");
  return new Resend(key);
}

// GET — list recent emails sent via Resend
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const resend = getResend();
    const result = await resend.emails.list();
    return NextResponse.json({ emails: result.data?.data ?? [] });
  } catch (e: any) {
    console.error("[list emails]", e?.message);
    return NextResponse.json({ emails: [], error: e?.message }, { status: 200 });
  }
}
