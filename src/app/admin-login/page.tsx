import { AdminLoginForm } from "@/components/admin-login-form";
import { PackageCheck } from "lucide-react";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0047bb] text-white shadow-lg">
          <PackageCheck size={28} />
        </span>
        <div>
          <p className="text-xl font-black text-[#07152f]">Royal Runs</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0047bb]">
            Admin Access
          </p>
        </div>
      </div>
      <AdminLoginForm nextPath={next} />
    </main>
  );
}
