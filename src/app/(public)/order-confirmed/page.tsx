import Link from "next/link";
import { CheckCircle2, Package } from "lucide-react";

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ tracking?: string }>;
}) {
  const { tracking } = await searchParams;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg text-center">
        {/* Success icon */}
        <div className="mb-6 flex justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dcfce7]">
            <CheckCircle2 className="text-[#059669]" size={44} strokeWidth={1.8} />
          </span>
        </div>

        <h1 className="text-3xl font-black text-[#07152f] md:text-4xl">
          Order Placed!
        </h1>
        <p className="mt-4 leading-7 text-[#10213f]">
          Your shipment has been booked with TBC. We will be in touch to
          confirm your collection slot. The recipient will receive a tracking
          email shortly.
        </p>

        {/* Tracking number card */}
        {tracking && (
          <div className="mt-8 rounded-xl border border-[#c8d9f5] bg-[#f3f7ff] p-7">
            <p className="text-sm font-bold uppercase tracking-widest text-[#0047bb]">
              Your Tracking Number
            </p>
            <p className="mt-3 font-mono text-2xl font-black tracking-widest text-[#07152f]">
              {tracking}
            </p>
            <p className="mt-2 text-xs text-[#50627f]">
              Save this number — you can use it to track your parcel at any time.
            </p>
            <Link
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0047bb] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#003a9e]"
              href={`/track?q=${tracking}`}
            >
              <Package aria-hidden="true" size={16} />
              Track Your Parcel
            </Link>
          </div>
        )}

        {/* Secondary actions */}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-[#10213f] transition-colors hover:bg-slate-50"
            href="/services"
          >
            Book another service
          </Link>
          <Link
            className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-[#10213f] transition-colors hover:bg-slate-50"
            href="/"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
