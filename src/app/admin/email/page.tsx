import { redirect } from "next/navigation";
import { EmailInbox } from "@/components/email-inbox";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function EmailInboxPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin-login");

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <EmailInbox />
    </main>
  );
}
