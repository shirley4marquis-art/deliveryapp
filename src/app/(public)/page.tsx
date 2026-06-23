import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  Briefcase,
  Clock3,
  Headphones,
  MapPin,
  Package,
  Shield,
  ShieldCheck,
  Smartphone,
  Star,
  Truck,
} from "lucide-react";
import { HomeTrackForm } from "@/components/home-track-form";

const services = [
  {
    icon: <Truck size={22} />,
    title: "Same-day delivery",
    desc: "Fast and reliable same-day delivery across the UK.",
  },
  {
    icon: <Clock3 size={22} />,
    title: "Next-day delivery",
    desc: "Next-day delivery to major UK cities and towns.",
  },
  {
    icon: <Package size={22} />,
    title: "Standard delivery",
    desc: "Cost-effective delivery within 2–3 working days.",
  },
  {
    icon: <Briefcase size={22} />,
    title: "Business courier",
    desc: "Tailored courier solutions for businesses of all sizes.",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "Secure delivery",
    desc: "Safe handling for parcels and important documents.",
  },
];

const trustStats = [
  {
    icon: <Star fill="currentColor" size={18} className="text-[#ef3340]" />,
    title: "Trusted by thousands",
    desc: "4.8/5 from 2,000+ reviews",
    stars: true,
  },
  {
    icon: <MapPin size={28} className="text-[#0047bb]" />,
    title: "UK wide coverage",
    desc: "Delivering to 99% of the UK",
    stars: false,
  },
  {
    icon: <Headphones size={28} className="text-[#0047bb]" />,
    title: "24/7 Support",
    desc: "Always here to help you",
    stars: false,
  },
  {
    icon: <ShieldCheck size={28} className="text-[#0047bb]" />,
    title: "Secure & Insured",
    desc: "Your parcels are in safe hands",
    stars: false,
  },
];

const features = [
  { icon: <MapPin size={22} />, title: "Real-time tracking", desc: "Track your parcel in real-time" },
  { icon: <Bell size={22} />, title: "Live updates", desc: "Get instant delivery updates" },
  { icon: <Smartphone size={22} />, title: "Easy to use", desc: "Simple and user-friendly platform" },
  { icon: <Shield size={22} />, title: "Safe & reliable", desc: "We deliver with care" },
];

const trackingSteps = [
  { label: "Collected", time: "10 May, 10:30 AM" },
  { label: "Sorting facility", time: "10 May, 02:15 PM" },
  { label: "Out for delivery", time: "11 May, 08:45 AM" },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-[#f3f7ff] text-[#07152f]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:px-8">
          {/* Left */}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef3340]">
              TBC Courier Service
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight tracking-tight md:text-6xl">
              Fast, Secure &amp; Reliable UK Parcel Delivery
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#10213f]">
              Book shipments, track every scan, and manage deliveries across the
              UK with a professional courier platform built for speed and trust.
            </p>

            <HomeTrackForm />

            {/* CTA buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="flex items-center gap-2 rounded-lg bg-[#0047bb] px-5 py-3 text-sm font-bold text-white hover:bg-[#0039a0]"
                href="/services"
              >
                <Truck size={16} />
                View Services
              </Link>
            </div>
          </div>

          {/* Right – van image with overlay card */}
          <div className="relative min-h-[480px] overflow-hidden rounded-2xl shadow-2xl">
            <Image
              alt="TBC courier loading parcels into a branded van"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              src="/images/royal-runs/courier-van-loading.jpg"
            />

            {/* Tracking overlay card */}
            <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-white p-5 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Route RR-24
              </p>
              <p className="mt-1 text-xl font-black text-[#07152f]">London to Leeds</p>
              <div className="mt-4 grid gap-3">
                {trackingSteps.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0047bb] text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#07152f]">{step.label}</p>
                      <p className="text-xs text-slate-500">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/track"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0047bb] hover:underline"
              >
                Track Shipment →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services strip */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {services.map((s) => (
              <div key={s.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0047bb] text-white">
                  {s.icon}
                </span>
                <div>
                  <p className="font-bold text-[#07152f]">{s.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#1f3556]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust stats bar */}
      <section className="border-y border-[#c8d9f5] bg-[#f3f7ff] py-10">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {trustStats.map((stat) => (
              <div key={stat.title} className="flex items-center gap-4">
                {stat.stars ? (
                  <div>
                    <p className="font-bold text-[#07152f]">{stat.title}</p>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4].map((n) => (
                        <Star key={n} size={16} fill="#ef3340" className="text-[#ef3340]" />
                      ))}
                      <Star size={16} fill="none" strokeWidth={2} className="text-[#ef3340]" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{stat.desc}</p>
                  </div>
                ) : (
                  <>
                    <span className="shrink-0">{stat.icon}</span>
                    <div>
                      <p className="font-bold text-[#0047bb]">{stat.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{stat.desc}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark blue features banner */}
      <section className="bg-[#07152f] py-10 text-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/20">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-4 lg:px-6 first:lg:pl-0 last:lg:pr-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-white">
                  {f.icon}
                </span>
                <div>
                  <p className="font-bold">{f.title}</p>
                  <p className="mt-0.5 text-xs text-white/70">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
