import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function NewOrderAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin-login");
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <AdminDashboard />
    </main>
  );
}
