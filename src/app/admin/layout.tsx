import { PackageCheck } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f7ff]">
      {/* Admin-only top bar */}
      <div className="border-b border-[#c8d9f5] bg-[#0047bb] shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <PackageCheck aria-hidden="true" className="text-white" size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-white">TBC Admin</p>
              <p className="text-xs font-semibold text-white/60">Secure dashboard</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-300 hover:text-white"
            target="_blank"
          >
            View live site ↗
          </Link>
        </div>
      </div>

      {/* Admin content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
