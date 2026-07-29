import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";
import { sendRucoShipmentReceivedEmail } from "@/lib/email";
import { isRucoSupplyShipment } from "@/lib/ruco";

const maxFileSize = 10 * 1024 * 1024;

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

  if (!image.type.toLowerCase().startsWith("image/")) {
    return NextResponse.json(
      { error: "The selected file must be an image." },
      { status: 400 },
    );
  }
  if (image.size > maxFileSize) {
    return NextResponse.json(
      { error: "Package images must be 10 MB or smaller." },
      { status: 400 },
    );
  }
  const extension = safeImageExtension(image);

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

  if (shipment.package_image_url) {
    const previousPath = storagePathFromPublicUrl(shipment.package_image_url);
    if (previousPath && previousPath !== objectPath) {
      await supabase.storage.from("package-images").remove([previousPath]);
    }
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseForUser(admin.accessToken);
  const { data: shipment, error } = await supabase
    .from("shipments")
    .select("package_image_url")
    .eq("id", id)
    .single();

  if (error || !shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("shipments")
    .update({ package_image_url: null })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const objectPath = storagePathFromPublicUrl(shipment.package_image_url);
  if (objectPath) {
    await supabase.storage.from("package-images").remove([objectPath]);
  }

  return NextResponse.json({ ok: true });
}

function storagePathFromPublicUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/package-images/";
    const markerIndex = url.pathname.indexOf(marker);
    return markerIndex === -1
      ? null
      : decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function safeImageExtension(image: File) {
  const filenameExtension = image.name.split(".").at(-1)?.toLowerCase() || "";
  if (/^[a-z0-9]{1,12}$/.test(filenameExtension)) {
    return filenameExtension;
  }

  const mimeExtension = image.type
    .slice("image/".length)
    .split("+")[0]
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  return mimeExtension || "image";
}
