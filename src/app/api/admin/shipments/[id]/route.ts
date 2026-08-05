import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { parseShipmentInput, parseTrackingEventInput } from "@/lib/validation";
import type { Database } from "@/lib/database.types";
import {
  calculateProgress,
  fetchOSRMRoute,
  interpolatePosition,
  isMoving,
  isDelivered,
  routeDurationAtSpeed,
  routeProgressAtPosition,
  type RouteGeometry,
} from "@/lib/transit";

type DatabaseShipmentUpdate =
  Database["public"]["Tables"]["shipments"]["Update"];

// Build transit patch fields whenever status changes
async function buildTransitPatch(
  newStatus: string,
  currentShipment: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const pLat = currentShipment.pickup_lat as number | null;
  const pLng = currentShipment.pickup_lng as number | null;
  const dLat = currentShipment.delivery_lat as number | null;
  const dLng = currentShipment.delivery_lng as number | null;

  if (isDelivered(newStatus)) {
    return {
      live_tracking_enabled: false,
      current_lat: dLat,
      current_lng: dLng,
    };
  }

  if (isMoving(newStatus)) {
    // Re-initialise transit: reset start time and fetch fresh route
    const patch: Record<string, unknown> = {
      live_tracking_enabled: true,
      transit_started_at: new Date().toISOString(),
    };

    if (pLat && pLng && dLat && dLng) {
      const route = await fetchOSRMRoute(
        { lat: pLat, lng: pLng },
        { lat: dLat, lng: dLng },
      );
      if (route) {
        patch.route_geometry = route.geometry;
        patch.route_distance_km = route.distanceKm;
        patch.route_duration_minutes = routeDurationAtSpeed(route.distanceKm);
      }
    }

    return patch;
  }

  // Paused/hold status — stop movement, keep current position
  return { live_tracking_enabled: false };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = getSupabaseForUser(admin.accessToken);
    const { data, error } = await supabase
      .from("shipments")
      .select("*, tracking_events(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Shipment not found." },
        { status: error?.code === "PGRST116" ? 404 : 500 },
      );
    }

    return NextResponse.json({ shipment: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load shipment." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.action === "pause-live-tracking" || body.action === "resume-live-tracking") {
    const supabase = getSupabaseForUser(admin.accessToken);
    const { data: current, error: currentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", id)
      .single();
    if (currentError || !current) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    const geometry = current.route_geometry as RouteGeometry | null;
    const duration = current.route_distance_km
      ? routeDurationAtSpeed(current.route_distance_km)
      : current.route_duration_minutes || 0;
    if (!geometry?.length || !duration) {
      return NextResponse.json(
        { error: "Save valid sender and receiver map points before controlling live tracking." },
        { status: 400 },
      );
    }

    let patch: DatabaseShipmentUpdate;
    if (body.action === "pause-live-tracking") {
      const progress = current.transit_started_at
        ? calculateProgress(current.transit_started_at, duration)
        : 0;
      const position = interpolatePosition(geometry, progress);
      patch = {
        live_tracking_enabled: false,
        route_duration_minutes: duration,
        current_lat: position.lat,
        current_lng: position.lng,
      };
    } else {
      const progress =
        typeof current.current_lat === "number" &&
        typeof current.current_lng === "number"
          ? routeProgressAtPosition(geometry, {
              lat: current.current_lat,
              lng: current.current_lng,
            })
          : 0;
      patch = {
        live_tracking_enabled: true,
        route_duration_minutes: duration,
        current_status: isMoving(current.current_status)
          ? current.current_status
          : "In Transit",
        transit_started_at: new Date(
          Date.now() - progress * duration * 60_000,
        ).toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("shipments")
      .update(patch)
      .eq("id", id)
      .select("*, tracking_events(*)")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ shipment: data });
  }

  const parsed = parseShipmentInput(body);

  if (parsed.error || !parsed.shipment) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = getSupabaseForUser(admin.accessToken);
    const createdAt = body.created_at ? String(body.created_at) : null;

    // Fetch current shipment to compare status and get coords
    const { data: current } = await supabase
      .from("shipments")
      .select("current_status,pickup_lat,pickup_lng,delivery_lat,delivery_lng")
      .eq("id", id)
      .single();

    const newStatus = parsed.shipment.current_status;
    const statusChanged = current?.current_status !== newStatus;
    const transitPatch = statusChanged
      ? await buildTransitPatch(newStatus, current as Record<string, unknown>)
      : {};

    const { data, error } = await supabase
      .from("shipments")
      .update({
        ...parsed.shipment,
        ...transitPatch,
        ...(createdAt ? { created_at: createdAt } : {}),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shipment: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = getSupabaseForUser(admin.accessToken);
    const { error } = await supabase.from("shipments").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = parseTrackingEventInput(body);

  if (parsed.error || !parsed.event) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = getSupabaseForUser(admin.accessToken);

    const { data: eventData, error: eventError } = await supabase
      .from("tracking_events")
      .insert({ ...parsed.event, shipment_id: id })
      .select()
      .single();

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    // Fetch current shipment to compute transit patch
    const { data: current } = await supabase
      .from("shipments")
      .select("current_status,pickup_lat,pickup_lng,delivery_lat,delivery_lng")
      .eq("id", id)
      .single();

    const newStatus = parsed.event.status;
    const statusChanged = current?.current_status !== newStatus;
    const transitPatch = statusChanged
      ? await buildTransitPatch(newStatus, current as Record<string, unknown>)
      : {};

    const { error: shipmentError } = await supabase
      .from("shipments")
      .update({ current_status: newStatus, ...transitPatch })
      .eq("id", id);

    if (shipmentError) {
      return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }

    return NextResponse.json({ event: eventData }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add event." },
      { status: 500 },
    );
  }
}
