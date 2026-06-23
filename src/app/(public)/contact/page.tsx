import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageIntro } from "@/components/site-shell";

export default function ContactPage() {
  return (
    <main>
      <PageIntro eyebrow="Customer support" title="Contact">
        Speak to TBC about parcel tracking, courier services, business
        delivery plans, or shipment support.
      </PageIntro>
      <section className="mx-auto max-w-7xl px-5 pt-12 lg:px-8">
        <div className="motion-fade-up relative min-h-72 overflow-hidden rounded-lg shadow-xl">
          <Image
            alt="Courier completing a delivery stop beside a van"
            className="object-cover"
            fill
            sizes="100vw"
            src="/images/royal-runs/van-delivery-stop.jpg"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
          <div className="absolute left-6 top-6 max-w-md rounded-lg bg-white/95 p-5 shadow-lg">
            <h2 className="text-2xl font-black text-[#07152f]">
              Need help with a delivery?
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#10213f]">
              Send your tracking number and we will help with parcel status,
              delivery timing, or account support.
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1fr_0.85fr] lg:px-8">
        <form className="motion-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" />
            <Input label="Email address" type="email" />
          </div>
          <div className="mt-4">
            <Input label="Tracking number" placeholder="Optional" />
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-bold text-[#10213f]">Message</span>
            <textarea className="mt-2 min-h-36 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#0047bb]" required />
          </label>
          <button className="mt-5 rounded-lg bg-[#0047bb] px-5 py-3 text-sm font-bold text-white">
            Send message
          </button>
        </form>
        <aside className="grid gap-4">
          <ContactItem icon={<Mail />} title="Email" value="contact@royalruns.co.uk" />
          <ContactItem icon={<Phone />} title="Phone" value="07346 535643" />
          <ContactItem icon={<MapPin />} title="UK address" value="TBC House, 10 Courier Street, London, UK" />
          <ContactItem icon={<Clock />} title="Opening hours" value="Monday to Friday, 08:00-18:00. Saturday, 09:00-13:00." />
        </aside>
      </section>
    </main>
  );
}

function Input({
  label,
  type = "text",
  placeholder = "",
}: {
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#10213f]">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-4 outline-none focus:border-[#0047bb]"
        placeholder={placeholder}
        required={!placeholder}
        type={type}
      />
    </label>
  );
}

function ContactItem({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="motion-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-[#ef3340]">{icon}</span>
      <h2 className="mt-3 font-black">{title}</h2>
      <p className="mt-1 text-[#10213f]">{value}</p>
    </div>
  );
}
