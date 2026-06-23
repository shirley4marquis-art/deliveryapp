import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { generateTrackingNumber } from "@/lib/tracking";
import { parseShipmentInput } from "@/lib/validation";
import { fetchOSRMRoute, isMoving, isDelivered } from "@/lib/transit";

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
        transitPatch.route_duration_minutes = route.durationMinutes;
      }
    }

    const { data, error } = await supabase
      .from("shipments")
      .insert({
        ...s,
        ...transitPatch,
        ...(createdAt ? { created_at: createdAt } : {}),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    return NextResponse.json({ shipment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save." },
      { status: 500 },
    );
  }
}
