import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { sendCustomsEmail } from "@/lib/email";

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipment_id || "").trim();
  const chargeAmount = String(body.charge_amount || "").trim();

  if (!shipmentId) {
    return NextResponse.json({ error: "shipment_id is required." }, { status: 400 });
  }
  if (!chargeAmount) {
    return NextResponse.json({ error: "charge_amount is required." }, { status: 400 });
  }

  const supabase = getSupabaseForUser(admin.accessToken);

  const { data: shipment, error: fetchError } = await supabase
    .from("shipments")
    .select("tracking_number,receiver_name,receiver_email,receiver_address,receiver_city,receiver_postcode,sender_name,current_status")
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

  if (shipment.current_status !== "On Hold") {
    const { error: updateError } = await supabase
      .from("shipments")
      .update({
        customs_charge_amount: chargeAmount,
        current_status: "On Hold",
        live_tracking_enabled: false,
      })
      .eq("id", shipmentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: eventError } = await supabase.from("tracking_events").insert({
      shipment_id: shipmentId,
      event_time: new Date().toISOString(),
      location: shipment.receiver_city || "Customs clearance",
      status: "On Hold",
      description: `Shipment held pending settlement of £${chargeAmount} import VAT.`,
    });

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }
  }

  const result = await sendCustomsEmail({
    receiverName: String(shipment.receiver_name || ""),
    receiverEmail,
    trackingNumber: String(shipment.tracking_number || ""),
    senderName: String(shipment.sender_name || ""),
    chargeAmount,
    shipmentId,
  });

  // Log to email logs
  const subject = `Action Required — Import VAT Due on Your Parcel | Ref: ${shipment.tracking_number}`;
  try {
    await supabase.from("shipment_email_logs").insert({
      shipment_id: shipmentId,
      receiver_email: receiverEmail,
      status: "On Hold",
      subject,
      sent_successfully: result.success,
      error_message: result.error ?? null,
    });
  } catch { /* ignore */ }

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to send customs email." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, emailId: result.emailId });
}
