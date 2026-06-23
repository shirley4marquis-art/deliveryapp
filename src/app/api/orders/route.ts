import { NextResponse } from "next/server";
import { generateTrackingNumber } from "@/lib/tracking";
import { getServiceBySlug } from "@/lib/services-data";
import { sendStatusEmail } from "@/lib/email";

function addWorkingDays(date: Date, days: number): Date {
  if (days === 0) return new Date(date);
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const serviceSlug = String(body.service_slug ?? "").trim();
  const service = getServiceBySlug(serviceSlug);
  if (!service) {
    return NextResponse.json({ error: "Invalid service selected." }, { status: 400 });
  }

  const fields = {
    sender_name: String(body.sender_name ?? "").trim(),
    sender_address: String(body.sender_address ?? "").trim(),
    sender_city: String(body.sender_city ?? "").trim(),
    receiver_name: String(body.receiver_name ?? "").trim(),
    receiver_email: String(body.receiver_email ?? "").trim().toLowerCase(),
    receiver_address: String(body.receiver_address ?? "").trim(),
    receiver_city: String(body.receiver_city ?? "").trim(),
    receiver_postcode: String(body.receiver_postcode ?? "").trim().toUpperCase(),
    package_type: String(body.package_type ?? "").trim(),
    weight: String(body.weight ?? "").trim(),
  };

  const required = [
    "sender_name",
    "sender_address",
    "sender_city",
    "receiver_name",
    "receiver_email",
    "receiver_address",
    "receiver_city",
    "receiver_postcode",
    "package_type",
    "weight",
  ] as const;

  for (const f of required) {
    if (!fields[f]) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 },
      );
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.receiver_email)) {
    return NextResponse.json(
      { error: "Recipient email address is not valid." },
      { status: 400 },
    );
  }

  const trackingNumber = generateTrackingNumber();
  const estimatedDate = addWorkingDays(new Date(), service.estimatedDays);
  const estimatedDeliveryDate = estimatedDate.toISOString().split("T")[0];

  await sendStatusEmail({
    receiverName: fields.receiver_name,
    receiverEmail: fields.receiver_email,
    receiverAddress: fields.receiver_address,
    receiverCity: fields.receiver_city,
    receiverPostcode: fields.receiver_postcode,
    trackingNumber,
    status: "Shipment Created",
    estimatedDeliveryDate,
    shipmentId: trackingNumber,
  });

  return NextResponse.json({ trackingNumber }, { status: 201 });
}
