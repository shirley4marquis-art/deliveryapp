import { NextResponse } from "next/server";
import { getSupabasePublic } from "@/lib/supabase";
import { normaliseTrackingNumber } from "@/lib/tracking";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackingNumber: string }> },
) {
  const { trackingNumber } = await params;
  const tracking = normaliseTrackingNumber(trackingNumber);

  try {
    const supabase = getSupabasePublic();
    const { data, error } = await supabase.rpc("get_public_tracking", {
      p_tracking_number: tracking,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Tracking number not found. Please check and try again." },
        { status: 404 },
      );
    }

    return NextResponse.json({ shipment: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tracking failed." },
      { status: 500 },
    );
  }
}
