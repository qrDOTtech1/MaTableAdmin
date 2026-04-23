import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY non configure");
  return new Resend(key);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const resend = getResend();
    const { from, to, subject, html, text } = await req.json();

    if (!from || !to || !subject) {
      return NextResponse.json({ error: "from, to, subject requis" }, { status: 400 });
    }

    // Validate from address ends with @matable.pro
    const fromEmail = from.includes("@") ? from : `${from}@matable.pro`;
    if (!fromEmail.endsWith("@matable.pro")) {
      return NextResponse.json({ error: "L'adresse d'envoi doit etre @matable.pro" }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
    });

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (e: any) {
    console.error("[send email]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Erreur envoi" }, { status: 500 });
  }
}
