import { redirect } from "next/navigation";
import { AdminPortal } from "@/components/admin-portal";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let authenticated = false;
  try {
    authenticated = await isAdminAuthenticated();
  } catch {
    authenticated = false;
  }

  if (!authenticated) {
    redirect("/admin-login");
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <AdminPortal />
    </main>
  );
}
