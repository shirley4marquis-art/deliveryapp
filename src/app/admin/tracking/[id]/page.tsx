import { redirect } from "next/navigation";
import { TrackingEditor } from "@/components/tracking-editor";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function TrackingEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin-login");
  }

  const { id } = await params;
  return <TrackingEditor shipmentId={id} />;
}
