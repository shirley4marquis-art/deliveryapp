import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { sendStatusEmail } from "@/lib/email";

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipment_id || "").trim();

  if (!shipmentId) {
    return NextResponse.json({ error: "shipment_id is required." }, { status: 400 });
  }

  const supabase = getSupabaseForUser(admin.accessToken);

  // Fetch full shipment details
  const { data: shipment, error: fetchError } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  if (fetchError || !shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  const receiverEmail = (shipment as Record<string, unknown>).receiver_email as string | null;
  if (!receiverEmail) {
    return NextResponse.json(
      { error: "This shipment has no receiver email address." },
      { status: 400 },
    );
  }

  const emailData = {
    receiverName: String(shipment.receiver_name || ""),
    receiverEmail,
    receiverAddress: String(shipment.receiver_address || ""),
    receiverCity: String(shipment.receiver_city || ""),
    receiverPostcode: String(shipment.receiver_postcode || ""),
    trackingNumber: String(shipment.tracking_number || ""),
    status: String(shipment.current_status || ""),
    estimatedDeliveryDate: String(shipment.estimated_delivery_date || ""),
    shipmentId,
  };

  const result = await sendStatusEmail(emailData);

  // Log the attempt (best-effort — don't fail the response if this errors)
  const subject = `TBC Update: ${emailData.status} — Tracking ${emailData.trackingNumber}`;
  try {
    await supabase.from("shipment_email_logs").insert({
      shipment_id: shipmentId,
      receiver_email: receiverEmail,
      status: emailData.status,
      subject,
      sent_successfully: result.success,
      error_message: result.error ?? null,
    });
  } catch { /* ignore log failures */ }

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to send email." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, emailId: result.emailId });
}
