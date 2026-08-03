import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const { id } = await params;
  const supabase = getSupabaseForUser(admin.accessToken);
  const [{ data: settings, error }, { data: logs }] = await Promise.all([
    supabase.from("shipment_email_automation").select("*").eq("shipment_id", id).maybeSingle(),
    supabase.from("shipment_automation_email_logs").select("*").eq("shipment_id", id).order("scheduled_for"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings, logs: logs || [] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const clean = (value: unknown) => String(value || "").trim() || null;
  const deadline = clean(body.payment_deadline);
  if (deadline && Number.isNaN(new Date(deadline).getTime())) {
    return NextResponse.json({ error: "Enter a valid payment deadline." }, { status: 400 });
  }
  const supabase = getSupabaseForUser(admin.accessToken);
  const { data, error } = await supabase
    .from("shipment_email_automation")
    .upsert({
      shipment_id: id,
      enabled: body.enabled === true,
      packaging_fee_paid: body.packaging_fee_paid === true,
      vat_fee_paid: body.vat_fee_paid === true,
      seller_legal_name: clean(body.seller_legal_name),
      vat_registration_number: clean(body.vat_registration_number),
      vat_invoice_number: clean(body.vat_invoice_number),
      payment_deadline: deadline,
      payment_instructions: clean(body.payment_instructions),
      delivery_time_window: clean(body.delivery_time_window),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
