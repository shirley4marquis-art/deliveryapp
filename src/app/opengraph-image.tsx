import { createSocialPreview, socialPreviewSize } from "@/lib/social-preview";

export const alt = "Royal Runs UK parcel delivery service";
export const size = socialPreviewSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return createSocialPreview();
}
