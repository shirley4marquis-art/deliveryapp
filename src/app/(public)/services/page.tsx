import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageIntro } from "@/components/site-shell";
import { SERVICES } from "@/lib/services-data";

export default function ServicesPage() {
  return (
    <main>
      <PageIntro eyebrow="Courier services" title="Services">
        Flexible delivery options for parcels, business logistics, urgent
        consignments, and secure document movement across the UK.
      </PageIntro>
      <section className="mx-auto grid max-w-7xl gap-6 px-5 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="motion-fade-up relative min-h-80 overflow-hidden rounded-lg shadow-xl">
          <Image
            alt="Courier loading boxed parcels into a delivery van"
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 680px, 100vw"
            src="/images/royal-runs/van-parcel-stack.jpg"
          />
        </div>
        <div className="motion-fade-up motion-delay-1 rounded-lg border border-[#c8d9f5] bg-[#f3f7ff] p-6">
          <h2 className="text-3xl font-black text-[#07152f]">
            Courier services built around real delivery work.
          </h2>
          <p className="mt-4 leading-8 text-[#10213f]">
            TBC supports doorstep parcels, warehouse collections,
            business routes, and secure document drops with clear statuses and
            reliable tracking records.
          </p>
          <div className="motion-route-line mt-6 h-1 rounded-full" />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-12 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {SERVICES.map(({ slug, name, description, price, timing }, index) => (
          <article
            className={`motion-card motion-fade-up motion-delay-${Math.min(index, 3)} flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm`}
            key={slug}
          >
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[#ef3340]">
                {timing}
              </p>
              <h2 className="mt-2 text-xl font-black text-[#07152f]">{name}</h2>
              <p className="mt-3 leading-7 text-[#10213f]">{description}</p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
              <span className="font-bold text-[#0047bb]">{price}</span>
              <Link
                className="flex items-center gap-1.5 rounded-lg bg-[#0047bb] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#003a9e]"
                href={`/services/${slug}`}
              >
                View &amp; Book
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
