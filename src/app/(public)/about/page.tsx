import Image from "next/image";
import { PageIntro } from "@/components/site-shell";

export default function AboutPage() {
  return (
    <main>
      <PageIntro eyebrow="About TBC" title="Royal Mail branch delivery service">
        TBC operates as a Royal Mail branch delivery service, helping
        customers and local businesses manage parcel dispatch, tracking, and
        courier support with a reliable UK delivery workflow.
      </PageIntro>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="motion-fade-up relative min-h-96 overflow-hidden rounded-lg shadow-xl">
          <Image
            alt="Classic UK postbox and London street"
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 520px, 100vw"
            src="/images/royal-runs/uk-postbox.jpg"
          />
        </div>
        <div className="motion-fade-up motion-delay-1 flex items-center rounded-lg border border-[#c8d9f5] bg-[#f3f7ff] p-6">
          <div>
            <h2 className="text-3xl font-black text-[#07152f]">
              A branch delivery team built around Royal Mail standards.
            </h2>
            <p className="mt-4 leading-8 text-[#10213f]">
              Our service is designed around the delivery standards customers
              expect from a Royal Mail branch: clear parcel tracking, careful
              handling, local support, and helpful updates from dispatch to
              final delivery.
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="motion-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Our mission</h2>
          <p className="mt-4 leading-8 text-[#10213f]">
            We make branch delivery feel straightforward: accurate tracking
            numbers, useful timeline updates, professional parcel handling, and
            support that keeps senders and receivers informed.
          </p>
        </div>
      </section>
    </main>
  );
}
