import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { sendCustomEmail, sendStatusEmail } from "@/lib/email";

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipment_id || "").trim();
  const customSubject = String(body.subject || "").trim();
  const customMessage = String(body.message || "").trim();
  const templateType = String(body.template_type || "").trim();

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
    packageImageUrl: shipment.package_image_url,
    shipmentId,
  };

  if ((customSubject && !customMessage) || (!customSubject && customMessage)) {
    return NextResponse.json(
      { error: "Both subject and message are required for a custom email." },
      { status: 400 },
    );
  }

  if (templateType === "vat") {
    const chargeAmount = String(body.charge_amount || "110.00").trim();
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
  }

  const result = customSubject
    ? await sendCustomEmail({
        receiverEmail,
        receiverName: emailData.receiverName,
        trackingNumber: emailData.trackingNumber,
        subject: customSubject,
        message: customMessage,
        status: emailData.status,
        estimatedDeliveryDate: emailData.estimatedDeliveryDate,
        packageImageUrl: emailData.packageImageUrl,
      })
    : await sendStatusEmail(emailData);

  // Log the attempt (best-effort — don't fail the response if this errors)
  const subject = customSubject || `Royal Runs Delivery Update: ${emailData.status} — Tracking ${emailData.trackingNumber}`;
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
