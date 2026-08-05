import { NextResponse } from "next/server";
import { processEmailAutomations } from "@/lib/email-sequence-automation";

export async function POST(request: Request) {
  const expected = process.env.AUTOMATION_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const result = await processEmailAutomations();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process email automations." },
      { status: 500 },
    );
  }
}
