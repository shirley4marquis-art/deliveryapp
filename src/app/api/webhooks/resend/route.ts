import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServiceRole } from "@/lib/supabase";

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

  const senderEmail = extractEmailAddress(event.data.from);

  // Prevent an accidental forwarding loop if the office mailbox sends to the
  // Resend receiving address.
  if (senderEmail === OFFICE_EMAIL) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: receivedEmail } = await resend.emails.receiving.get(
    event.data.email_id,
  );
  const replyPreview = (
    receivedEmail?.text ||
    receivedEmail?.html?.replace(/<[^>]+>/g, " ") ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  if (senderEmail) {
    const supabase = getSupabaseServiceRole();
    const { data: shipment } = await supabase
      .from("shipments")
      .select("id,tracking_number,receiver_name,receiver_email,current_status")
      .ilike("receiver_email", senderEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shipment) {
      await supabase.from("shipment_email_logs").insert({
        shipment_id: shipment.id,
        receiver_email: senderEmail,
        status: "Customer reply received",
        subject: event.data.subject || "Customer reply",
        sent_successfully: true,
        error_message: replyPreview || null,
        sent_at: event.data.created_at,
      });
      await notifyTelegramOfReply({
        customerName: shipment.receiver_name,
        customerEmail: senderEmail,
        trackingNumber: shipment.tracking_number,
        subject: event.data.subject || "Customer reply",
        preview: replyPreview,
        shipmentId: shipment.id,
      });
    }
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

function extractEmailAddress(value: string) {
  return (
    value.match(/<([^>]+@[^>]+)>/)?.[1] ||
    value.match(/[^\s<>]+@[^\s<>]+/)?.[0] ||
    ""
  )
    .trim()
    .toLowerCase();
}

async function notifyTelegramOfReply({
  customerName,
  customerEmail,
  trackingNumber,
  subject,
  preview,
  shipmentId,
}: {
  customerName: string;
  customerEmail: string;
  trackingNumber: string;
  subject: string;
  preview: string;
  shipmentId: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.split(",")[0]?.trim();
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: [
        "Customer email reply received",
        "",
        `Customer: ${customerName}`,
        `Email: ${customerEmail}`,
        `Tracking: ${trackingNumber}`,
        `Subject: ${subject}`,
        preview ? `Reply: ${preview}` : "",
        "",
        `Review: ${process.env.SITE_URL || "https://royalruns.co.uk"}/admin/tracking/${shipmentId}`,
      ]
        .filter(Boolean)
        .join("\n"),
      disable_web_page_preview: true,
    }),
  });
}
