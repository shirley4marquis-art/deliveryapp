import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { PageIntro } from "@/components/site-shell";
import { getAllServices, getServiceBySlug } from "@/lib/services-data";

export function generateStaticParams() {
  return getAllServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return { title: `${service.name} | TBC` };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <main>
      <PageIntro eyebrow={service.timing} title={service.name}>
        {service.description}
      </PageIntro>

      {/* Image gallery — hero + 2 side images */}
      <section className="mx-auto max-w-7xl px-5 pt-8 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="relative min-h-[320px] overflow-hidden rounded-xl shadow-lg lg:min-h-[480px]">
            <Image
              alt={service.name}
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 800px, 100vw"
              src={service.heroImage}
            />
          </div>
          <div className="grid gap-4">
            {service.gallery.map((img, i) => (
              <div
                className="relative min-h-[150px] overflow-hidden rounded-xl shadow-md lg:min-h-0"
                key={i}
              >
                <Image
                  alt={`${service.name} — photo ${i + 2}`}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 380px, 50vw"
                  src={img}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features + booking card */}
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1fr_340px] lg:px-8">
        <div>
          <h2 className="text-2xl font-black text-[#07152f]">What&apos;s included</h2>
          <ul className="mt-6 grid gap-4">
            {service.features.map((f) => (
              <li className="flex items-start gap-3 text-[#10213f]" key={f}>
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#ef3340]"
                  size={20}
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Booking card */}
        <div className="h-fit rounded-xl border border-[#c8d9f5] bg-[#f3f7ff] p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-[#ef3340]">
            {service.timing}
          </p>
          <p className="mt-2 text-3xl font-black text-[#07152f]">{service.price}</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#10213f]">
            <Clock aria-hidden="true" size={15} />
            {service.timing}
          </div>

          <div className="motion-route-line mt-5 h-px rounded-full" />

          <Link
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0047bb] px-5 py-3.5 font-bold text-white transition-colors hover:bg-[#003a9e]"
            href={`/order/${service.slug}`}
          >
            Book This Service
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <p className="mt-3 text-center text-xs leading-5 text-[#50627f]">
            No payment taken online — we confirm your booking and invoice you directly.
          </p>
        </div>
      </section>

      {/* Back to all services */}
      <div className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
        <Link
          className="text-sm font-semibold text-[#0047bb] hover:underline"
          href="/services"
        >
          ← View all services
        </Link>
      </div>
    </main>
  );
}
