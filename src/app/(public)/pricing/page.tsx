import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageIntro } from "@/components/site-shell";

const plans = [
  {
    name: "Standard",
    slug: "standard",
    price: "From GBP 4.95",
    timing: "2-4 working days",
    features: ["Parcel tracking", "Depot scans", "Email support"],
  },
  {
    name: "Next Day",
    slug: "next-day",
    price: "From GBP 8.95",
    timing: "Next working day",
    features: ["Priority routing", "ETA visibility", "Proof of delivery"],
  },
  {
    name: "Same Day",
    slug: "same-day",
    price: "Quoted per job",
    timing: "Same day",
    features: ["Dedicated courier", "Urgent collection", "Direct delivery"],
  },
];

export default function PricingPage() {
  return (
    <main>
      <PageIntro eyebrow="Clear delivery costs" title="Pricing">
        Simple courier pricing for UK parcel delivery. Business accounts can
        request custom rates for repeat collections and higher volumes.
      </PageIntro>
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-12 md:grid-cols-3 lg:px-8">
        {plans.map(({ name, slug, price, timing, features }) => (
          <article
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            key={name}
          >
            <div className="flex-1">
              <h2 className="text-2xl font-black">{name}</h2>
              <p className="mt-3 text-3xl font-black text-[#0047bb]">{price}</p>
              <p className="mt-2 font-semibold text-[#1f3556]">{timing}</p>
              <div className="mt-6 grid gap-3">
                {features.map((feature) => (
                  <p
                    className="flex items-center gap-2 text-sm text-[#10213f]"
                    key={feature}
                  >
                    <CheckCircle2 className="text-[#ef3340]" size={18} />
                    {feature}
                  </p>
                ))}
              </div>
            </div>
            <Link
              className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#0047bb] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#003a9e]"
              href={`/services/${slug}`}
            >
              Book This Service
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </article>
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
        <div className="rounded-lg border border-[#c8d9f5] bg-[#f3f7ff] p-8 text-[#07152f]">
          <h2 className="text-2xl font-black">Need business courier rates?</h2>
          <p className="mt-3 max-w-2xl text-[#10213f]">
            Tell us your delivery volume, collection locations, and service
            level needs. We will prepare a tailored UK courier plan.
          </p>
          <Link
            className="mt-5 inline-flex rounded-lg bg-[#ef3340] px-5 py-3 text-sm font-bold text-white"
            href="/contact"
          >
            Request quote
          </Link>
        </div>
      </section>
    </main>
  );
}
