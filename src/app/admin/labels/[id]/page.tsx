import { redirect } from "next/navigation";
import { ShippingLabelGenerator } from "@/components/shipping-label-generator";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function ShippingLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin-login");
  }

  const { id } = await params;
  return <ShippingLabelGenerator shipmentId={id} />;
}
