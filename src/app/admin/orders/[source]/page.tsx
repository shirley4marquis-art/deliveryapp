import { notFound, redirect } from "next/navigation";
import { SourceOrdersDashboard } from "@/components/source-orders-dashboard";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  shipmentSources,
  type ShipmentSource,
} from "@/lib/shipment-source";

export const dynamic = "force-dynamic";

export default async function SourceOrdersPage({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin-login");
  }

  const { source } = await params;
  if (!shipmentSources.includes(source as ShipmentSource)) {
    notFound();
  }

  return <SourceOrdersDashboard source={source as ShipmentSource} />;
}
