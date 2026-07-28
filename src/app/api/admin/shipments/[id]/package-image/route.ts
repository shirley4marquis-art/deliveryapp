import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getSupabaseForUser } from "@/lib/supabase";

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
    .select("id,current_status")
    .eq("id", id)
    .single();

  if (shipmentError || !shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }
  if (shipment.current_status !== "Parcel Collected") {
    return NextResponse.json(
      { error: "A package image can be added when the status is Parcel Collected." },
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

  return NextResponse.json({ imageUrl: publicUrl.publicUrl });
}
