import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { sendRucoShipmentReceivedEmail } from "@/lib/email";
import { isRucoSupplyShipment } from "@/lib/ruco";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Select a package image to upload." },
      { status: 400 },
    );
  }

  const extension = allowedTypes.get(image.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Package images must be JPEG, PNG, or WebP." },
      { status: 400 },
    );
  }
  if (image.size > maxFileSize) {
    return NextResponse.json(
      { error: "Package images must be 5 MB or smaller." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseForUser(admin.accessToken);
  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", id)
    .single();

  if (shipmentError || !shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }
  const isRucoAtCreation =
    shipment.current_status === "Shipment Created" &&
    isRucoSupplyShipment(shipment);
  if (shipment.current_status !== "Parcel Collected" && !isRucoAtCreation) {
    return NextResponse.json(
      {
        error:
          "A package image can be added to a new Ruco shipment or when a parcel is collected.",
      },
      { status: 409 },
    );
  }

  const objectPath = `${id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("package-images")
    .upload(objectPath, image, {
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage
    .from("package-images")
    .getPublicUrl(objectPath);
  const { error: updateError } = await supabase
    .from("shipments")
    .update({ package_image_url: publicUrl.publicUrl })
    .eq("id", id);

  if (updateError) {
    await supabase.storage.from("package-images").remove([objectPath]);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let confirmationEmail:
    | { sent: boolean; error?: string }
    | undefined;

  if (isRucoAtCreation && shipment.receiver_email) {
    const subject = `Please confirm your delivery details | Ref: ${shipment.tracking_number}`;
    const emailResult = await sendRucoShipmentReceivedEmail({
      receiverName: shipment.receiver_name,
      receiverEmail: shipment.receiver_email,
      receiverAddress: shipment.receiver_address,
      receiverCity: shipment.receiver_city,
      receiverPostcode: shipment.receiver_postcode,
      trackingNumber: shipment.tracking_number,
      status: shipment.current_status,
      estimatedDeliveryDate: shipment.estimated_delivery_date,
      shipmentId: shipment.id,
      packageImageUrl: publicUrl.publicUrl,
    });

    await supabase.from("shipment_email_logs").insert({
      shipment_id: shipment.id,
      receiver_email: shipment.receiver_email,
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

  return NextResponse.json({
    imageUrl: publicUrl.publicUrl,
    confirmationEmail,
  });
}
