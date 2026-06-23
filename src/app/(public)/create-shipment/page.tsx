import Link from "next/link";
import { PageIntro } from "@/components/site-shell";

export default function CreateShipmentPage() {
  return (
    <main>
      <PageIntro eyebrow="Shipment creation" title="Create Shipment">
        TBC shipment creation is managed from the secure admin dashboard
        so parcel records, tracking numbers, and timeline events stay protected.
      </PageIntro>
      <section className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">Create a new TBC shipment</h2>
          <p className="mt-3 leading-7 text-[#10213f]">
            Admin users can create shipments, generate tracking numbers in the
            RR123456789GB format, set estimated delivery dates, and add the
            first status update from the dashboard.
          </p>
          <Link
            className="mt-6 inline-flex rounded-lg bg-[#0047bb] px-5 py-3 text-sm font-bold text-white"
            href="/admin"
          >
            Open admin dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
