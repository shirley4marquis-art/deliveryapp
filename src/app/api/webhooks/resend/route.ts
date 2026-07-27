import { NextResponse } from "next/server";
import { Resend } from "resend";

const OFFICE_EMAIL = "office@royalruns.co.uk";
const FORWARD_FROM =
  process.env.RESEND_FROM_EMAIL ||
  "Royal Runs Delivery <office@royalruns.co.uk>";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Resend inbound email is not configured." },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const resend = new Resend(apiKey);

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") || "",
        timestamp: request.headers.get("svix-timestamp") || "",
        signature: request.headers.get("svix-signature") || "",
      },
      webhookSecret,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Prevent an accidental forwarding loop if the office mailbox sends to the
  // Resend receiving address.
  if (event.data.from.toLowerCase() === OFFICE_EMAIL) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data, error } = await resend.emails.receiving.forward({
    emailId: event.data.email_id,
    from: FORWARD_FROM,
    to: OFFICE_EMAIL,
    passthrough: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, forwardedEmailId: data?.id });
}
