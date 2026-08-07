import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";

export async function GET(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const email = new URL(request.url).searchParams.get("email")?.trim();
  const supabase = getSupabaseForUser(admin.accessToken);
  let query = supabase
    .from("shipment_email_logs")
    .select(
      "id,shipment_id,receiver_email,status,subject,sent_successfully,error_message,sent_at,shipments(tracking_number,current_status,order_source)",
    )
    .order("sent_at", { ascending: false })
    .limit(500);

  if (email) {
    query = query.ilike("receiver_email", email);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const logs = (data || []).map((log) => {
    const related = Array.isArray(log.shipments)
      ? log.shipments[0]
      : log.shipments;
    return {
      id: log.id,
      shipment_id: log.shipment_id,
      receiver_email: log.receiver_email,
      status: log.status,
      subject: log.subject,
      sent_successfully: log.sent_successfully,
      error_message: log.error_message,
      sent_at: log.sent_at,
      tracking_number: related?.tracking_number || "",
      shipment_status: related?.current_status || "",
      order_source: related?.order_source || null,
    };
  });

  return NextResponse.json({ logs });
}
