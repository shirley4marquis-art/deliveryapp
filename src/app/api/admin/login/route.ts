import { NextResponse } from "next/server";
import { signInAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const result = await signInAdmin(email, password);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach Supabase Auth.";
    const isMissingEnv = message.includes("Missing environment variable");
    return NextResponse.json(
      {
        error: isMissingEnv
          ? "Server configuration error — contact the site administrator."
          : message,
      },
      { status: 500 },
    );
  }
}
