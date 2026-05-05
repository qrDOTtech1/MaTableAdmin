import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { canRunLocalProspectScraper, getProspectScraperController } from "@/lib/prospect-scraper";

export const dynamic = "force-dynamic";

const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const scraperSecret = process.env.ADMIN_SCRAPER_SECRET || process.env.JWT_SECRET || "";

async function forwardToApi(method: "GET" | "POST") {
  if (!apiBase || !scraperSecret) return null;

  const res = await fetch(`${apiBase}/api/internal/prospects/scraper`, {
    method,
    cache: "no-store",
    headers: {
      "x-scraper-secret": scraperSecret,
    },
  });

  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const remote = await forwardToApi("GET");
  if (remote) {
    return NextResponse.json(remote.json, { status: remote.status });
  }

  if (!canRunLocalProspectScraper()) {
    return NextResponse.json({ error: "scraper_unavailable", message: "Configure NEXT_PUBLIC_API_URL and ADMIN_SCRAPER_SECRET on the admin service." }, { status: 503 });
  }

  const controller = getProspectScraperController();
  return NextResponse.json(controller.getState());
}

export async function POST() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const remote = await forwardToApi("POST");
  if (remote) {
    return NextResponse.json(remote.json, { status: remote.status });
  }

  if (!canRunLocalProspectScraper()) {
    return NextResponse.json({ error: "scraper_unavailable", message: "Configure NEXT_PUBLIC_API_URL and ADMIN_SCRAPER_SECRET on the admin service." }, { status: 503 });
  }

  const controller = getProspectScraperController();
  const state = controller.start();

  return NextResponse.json(state, { status: state.status === "error" && !state.startedAt ? 500 : 200 });
}
