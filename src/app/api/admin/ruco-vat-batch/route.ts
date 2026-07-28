import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { sendCustomsEmail } from "@/lib/email";
import { getSupabaseForUser } from "@/lib/supabase";
import { RUCO_SUPPLY_CUSTOMERS } from "@/lib/ruco";

type RucoShipment = {
  id: string;
  tracking_number: string;
  receiver_name: string;
  receiver_email: string | null;
  sender_name: string;
  receiver_city: string;
  created_at: string;
};

function normaliseName(value: string) {
  return value.trim().toLowerCase();
}

async function getRucoShipments(accessToken: string) {
  const supabase = getSupabaseForUser(accessToken);
  const { data, error } = await supabase
    .from("shipments")
    .select(
      "id,tracking_number,receiver_name,receiver_email,sender_name,receiver_city,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, shipments: [] as RucoShipment[] };
  }

  const latestByCustomer = new Map<string, RucoShipment>();
  for (const shipment of (data || []) as RucoShipment[]) {
    const key = normaliseName(shipment.receiver_name);
    if (
      RUCO_SUPPLY_CUSTOMERS.some((name) => normaliseName(name) === key) &&
      !latestByCustomer.has(key)
    ) {
      latestByCustomer.set(key, shipment);
    }
  }

  return {
    error: null,
    shipments: RUCO_SUPPLY_CUSTOMERS.map((name) =>
      latestByCustomer.get(normaliseName(name)),
    ).filter((shipment): shipment is RucoShipment => Boolean(shipment)),
  };
}

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const result = await getRucoShipments(admin.accessToken);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    expected: RUCO_SUPPLY_CUSTOMERS.length,
    recipients: result.shipments.map((shipment) => ({
      id: shipment.id,
      name: shipment.receiver_name,
      email: shipment.receiver_email,
      trackingNumber: shipment.tracking_number,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Explicit confirmation is required." },
      { status: 400 },
    );
  }

  const lookup = await getRucoShipments(admin.accessToken);
  if (lookup.error) {
    return NextResponse.json({ error: lookup.error }, { status: 500 });
  }

  if (
    lookup.shipments.length !== RUCO_SUPPLY_CUSTOMERS.length ||
    lookup.shipments.some((shipment) => !shipment.receiver_email)
  ) {
    return NextResponse.json(
      {
        error:
          "All four Ruco shipments must exist and have verified recipient email addresses before sending.",
      },
      { status: 409 },
    );
  }

  const supabase = getSupabaseForUser(admin.accessToken);
  const results = [];

  for (const shipment of lookup.shipments) {
    const receiverEmail = shipment.receiver_email as string;
    const { error: updateError } = await supabase
      .from("shipments")
      .update({
        current_status: "On Hold",
        customs_charge_amount: "110.00",
      })
      .eq("id", shipment.id);

    if (updateError) {
      results.push({
        name: shipment.receiver_name,
        email: receiverEmail,
        sent: false,
        error: updateError.message,
      });
      continue;
    }

    await supabase.from("tracking_events").insert({
      shipment_id: shipment.id,
      event_time: new Date().toISOString(),
      location: shipment.receiver_city || "Customs clearance",
      status: "On Hold",
      description: "Shipment held pending settlement of £110.00 import VAT.",
    });

    const emailResult = await sendCustomsEmail({
      receiverName: shipment.receiver_name,
      receiverEmail,
      trackingNumber: shipment.tracking_number,
      senderName: shipment.sender_name || "Ruco Supply",
      chargeAmount: "110.00",
      shipmentId: shipment.id,
    });

    const subject = `Action Required — Import VAT Due on Your Parcel | Ref: ${shipment.tracking_number}`;
    await supabase.from("shipment_email_logs").insert({
      shipment_id: shipment.id,
      receiver_email: receiverEmail,
      status: "On Hold",
      subject,
      sent_successfully: emailResult.success,
      error_message: emailResult.error ?? null,
    });

    results.push({
      name: shipment.receiver_name,
      email: receiverEmail,
      trackingNumber: shipment.tracking_number,
      sent: emailResult.success,
      emailId: emailResult.emailId,
      error: emailResult.error,
    });
  }

  const sentCount = results.filter((result) => result.sent).length;
  return NextResponse.json(
    { sentCount, expected: RUCO_SUPPLY_CUSTOMERS.length, results },
    { status: sentCount === RUCO_SUPPLY_CUSTOMERS.length ? 200 : 207 },
  );
}
