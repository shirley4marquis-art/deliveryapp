import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parsePastedOrder } from "@/lib/order-import";
import { getSupabaseServiceRole } from "@/lib/supabase";
import { generateTrackingNumber } from "@/lib/tracking";

export const runtime = "nodejs";

const maximumClockSkewSeconds = 5 * 60;

function verifySignature(rawBody: string, timestamp: string, signature: string) {
  const secret = process.env.MRONECONNECT_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;

  const timestampNumber = Number(timestamp);
  if (
    !Number.isFinite(timestampNumber) ||
    Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) >
      maximumClockSkewSeconds
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const supplied = signature.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-mrone-timestamp") || "";
  const signature = request.headers.get("x-mrone-signature") || "";

  if (!verifySignature(rawBody, timestamp, signature)) {
    return NextResponse.json(
      { error: "Invalid or expired webhook signature." },
      { status: 401 },
    );
  }

  let body: { event?: string; orderId?: string; orderText?: string };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  if (body.event !== "checkout.details_submitted") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const orderId = String(body.orderId || "").trim();
  const orderText = String(body.orderText || "").trim();
  if (!orderId || !orderText) {
    return NextResponse.json(
      { error: "orderId and orderText are required." },
      { status: 400 },
    );
  }

  const imported = parsePastedOrder(orderText);
  if (
    imported.source !== "1:1 Connect" ||
    !imported.customerName ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(imported.customerEmail) ||
    !imported.deliveryAddress
  ) {
    return NextResponse.json(
      { error: "The 1:1 Connect checkout details are incomplete or invalid." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceRole();
  const { data: existing } = await supabase
    .from("shipments")
    .select("id,tracking_number")
    .eq("external_order_id", orderId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      created: false,
      duplicate: true,
      shipmentId: existing.id,
      trackingNumber: existing.tracking_number,
    });
  }

  const trackingNumber = generateTrackingNumber();
  const { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      tracking_number: trackingNumber,
      external_order_id: orderId,
      order_source: "mroneconnect.shop",
      sender_name: "1:1 Connect",
      sender_address: "Original dispatch unit",
      sender_city: "Dispatch unit",
      receiver_name: imported.customerName,
      receiver_email: imported.customerEmail.toLowerCase(),
      receiver_address: imported.deliveryAddress,
      receiver_city: imported.deliveryCity || "To be confirmed",
      receiver_postcode: imported.deliveryPostcode,
      package_type: imported.items.join("; ") || "Customer order",
      weight: "To be confirmed",
      delivery_service: imported.courier || "Standard delivery",
      current_status: "Shipment Created",
      estimated_delivery_date: addDays(new Date(), 3),
      notes: `${imported.notes}\nCheckout source: mroneconnect.shop\nExternal order ID: ${orderId}`,
    })
    .select("id,tracking_number")
    .single();

  if (error || !shipment) {
    const duplicate = error?.code === "23505";
    return NextResponse.json(
      {
        error: duplicate
          ? "This checkout was already processed."
          : error?.message || "Unable to create shipment.",
      },
      { status: duplicate ? 409 : 500 },
    );
  }

  await supabase.from("tracking_events").insert({
    shipment_id: shipment.id,
    event_time: new Date().toISOString(),
    location: imported.deliveryCity || "Order received",
    status: "Shipment Created",
    description: "Shipment created automatically from mroneconnect.shop checkout details.",
  });

  return NextResponse.json(
    {
      created: true,
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      trackingUrl: `${process.env.SITE_URL || "https://royalruns.co.uk"}/track?q=${shipment.tracking_number}`,
    },
    { status: 201 },
  );
}
