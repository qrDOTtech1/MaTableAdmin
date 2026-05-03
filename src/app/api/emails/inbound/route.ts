import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Webhook endpoint pour recevoir les emails depuis Resend Inbound
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Resend Inbound envoie généralement : from, to, subject, text, html
    const { from, to, subject, text, html } = payload;

    // Normalisation du champ "to"
    let toStr = "";
    if (Array.isArray(to)) {
      toStr = to.join(", ");
    } else if (typeof to === "string") {
      toStr = to;
    }

    if (!from || !toStr) {
      return NextResponse.json({ error: "Missing from or to" }, { status: 400 });
    }

    // Sauvegarde en BDD
    await prisma.receivedEmail.create({
      data: {
        from: typeof from === "string" ? from : JSON.stringify(from),
        to: toStr,
        subject: typeof subject === "string" ? subject : "Sans objet",
        text: typeof text === "string" ? text : null,
        html: typeof html === "string" ? html : null,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("[Inbound Email Error]", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
