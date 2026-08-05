import { redirect } from "next/navigation";
import { ThermalReceiptGenerator } from "@/components/thermal-receipt-generator";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function ReceiptPrinterPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin-login");
  return <ThermalReceiptGenerator />;
}
