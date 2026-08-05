import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { parseTrackingEventInput } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = parseTrackingEventInput(body);
  if (parsed.error || !parsed.event) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { eventId } = await params;
  const supabase = getSupabaseForUser(admin.accessToken);
  const { data, error } = await supabase
    .from("tracking_events")
    .update(parsed.event)
    .eq("id", eventId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { eventId } = await params;
  const supabase = getSupabaseForUser(admin.accessToken);
  const { error } = await supabase
    .from("tracking_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
