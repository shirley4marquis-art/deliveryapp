import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { generateTrackingNumber } from "@/lib/tracking";
import { parseShipmentInput } from "@/lib/validation";
import { fetchOSRMRoute, isMoving, isDelivered, routeDurationAtSpeed } from "@/lib/transit";
import { sendRucoShipmentReceivedEmail } from "@/lib/email";
import { isRucoSupplyShipment } from "@/lib/ruco";
import { sourceStorageValue } from "@/lib/shipment-source";
import { createDefaultEmailAutomation } from "@/lib/email-sequence-automation";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseForUser(admin.accessToken);
    const { data, error } = await supabase
      .from("shipments")
      .select("*, tracking_events(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shipments: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.action === "generate-tracking-number") {
    return NextResponse.json({ trackingNumber: generateTrackingNumber() });
  }

  const parsed = parseShipmentInput(body);
  if (parsed.error || !parsed.shipment) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = getSupabaseForUser(admin.accessToken);
    const createdAt = body.created_at ? String(body.created_at) : null;
    const s = parsed.shipment;

    // Build transit data if the initial status is a moving status
    const transitPatch: Record<string, unknown> = {};
    if (isDelivered(s.current_status) && s.delivery_lat && s.delivery_lng) {
      transitPatch.live_tracking_enabled = false;
      transitPatch.current_lat = s.delivery_lat;
      transitPatch.current_lng = s.delivery_lng;
    } else if (isMoving(s.current_status) && s.pickup_lat && s.pickup_lng && s.delivery_lat && s.delivery_lng) {
      transitPatch.live_tracking_enabled = true;
      transitPatch.transit_started_at = new Date().toISOString();
      const route = await fetchOSRMRoute(
        { lat: s.pickup_lat, lng: s.pickup_lng },
        { lat: s.delivery_lat, lng: s.delivery_lng },
      );
      if (route) {
        transitPatch.route_geometry = route.geometry;
        transitPatch.route_distance_km = route.distanceKm;
        transitPatch.route_duration_minutes = routeDurationAtSpeed(route.distanceKm);
      }
    }

    const shipmentToInsert = {
      ...s,
      order_source: sourceStorageValue(s.sender_name),
      ...transitPatch,
      ...(createdAt ? { created_at: createdAt } : {}),
    };

    let { data, error } = await supabase
      .from("shipments")
      .insert(shipmentToInsert)
      .select()
      .single();

    // Older deployments may not have the optional source-classification column
    // yet. Sender details still identify Ruco shipments, so retrying without it
    // allows shipment creation and the confirmation email to complete safely.
    if (
      error?.code === "PGRST204" &&
      error.message.includes("'order_source' column")
    ) {
      const legacyShipment = { ...shipmentToInsert, order_source: undefined };
      ({ data, error } = await supabase
        .from("shipments")
        .insert(legacyShipment)
        .select()
        .single());
    }

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Unable to create shipment." },
        { status: 500 },
      );
    }

    const { error: eventError } = await supabase.from("tracking_events").insert({
      shipment_id: data.id,
      event_time: new Date().toISOString(),
      location: parsed.shipment.sender_city,
      status: parsed.shipment.current_status,
      description: "Shipment record created.",
    });

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    let automationWarning: string | undefined;
    const { error: automationError } = await createDefaultEmailAutomation(data.id, data.created_at);
    if (automationError) {
      automationWarning = `Shipment created, but its email sequence could not be started: ${automationError.message}`;
    }

    let confirmationEmail:
      | { sent: boolean; error?: string }
      | undefined;

    if (
      isRucoSupplyShipment(data) &&
      data.receiver_email &&
      body.defer_ruco_confirmation !== true
    ) {
      const subject = `Please confirm your delivery details | Ref: ${data.tracking_number}`;
      const emailResult = await sendRucoShipmentReceivedEmail({
        receiverName: data.receiver_name,
        receiverEmail: data.receiver_email,
        receiverAddress: data.receiver_address,
        receiverCity: data.receiver_city,
        receiverPostcode: data.receiver_postcode,
        trackingNumber: data.tracking_number,
        status: data.current_status,
        estimatedDeliveryDate: data.estimated_delivery_date,
        shipmentId: data.id,
      });

      await supabase.from("shipment_email_logs").insert({
        shipment_id: data.id,
        receiver_email: data.receiver_email,
        status: "Ruco details confirmation",
        subject,
        sent_successfully: emailResult.success,
        error_message: emailResult.error ?? null,
      });

      confirmationEmail = {
        sent: emailResult.success,
        ...(emailResult.error ? { error: emailResult.error } : {}),
      };
    }

    return NextResponse.json(
      { shipment: data, confirmationEmail, automationWarning },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save." },
      { status: 500 },
    );
  }
}
