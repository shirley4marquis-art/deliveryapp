"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Package, User } from "lucide-react";
import type { ServiceData } from "@/lib/services-data";

const PACKAGE_TYPES = [
  "Parcel",
  "Letter",
  "Large Package",
  "Fragile Item",
  "Document",
  "Other",
];

type FormState = {
  package_type: string;
  weight: string;
  notes: string;
  sender_name: string;
  sender_address: string;
  sender_city: string;
  receiver_name: string;
  receiver_email: string;
  receiver_address: string;
  receiver_city: string;
  receiver_postcode: string;
};

const EMPTY: FormState = {
  package_type: "",
  weight: "",
  notes: "",
  sender_name: "",
  sender_address: "",
  sender_city: "",
  receiver_name: "",
  receiver_email: "",
  receiver_address: "",
  receiver_city: "",
  receiver_postcode: "",
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-[#07152f] placeholder:text-slate-400 focus:border-[#0047bb] focus:outline-none focus:ring-1 focus:ring-[#0047bb]";
const labelCls = "block text-sm font-semibold text-[#10213f] mb-1.5";

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0047bb] text-white">
        <Icon aria-hidden="true" size={16} />
      </span>
      <h2 className="text-xl font-black text-[#07152f]">{title}</h2>
    </div>
  );
}

export function OrderForm({ service }: { service: ServiceData }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, service_slug: service.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/order-confirmed?tracking=${data.trackingNumber}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const hasSummaryData = form.sender_name || form.receiver_name || form.package_type;

  return (
    <main>
      {/* Page header */}
      <div className="border-b border-[#c8d9f5] bg-[#f3f7ff]">
        <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
          <Link
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0047bb] hover:underline"
            href={`/services/${service.slug}`}
          >
            <ArrowLeft aria-hidden="true" size={15} />
            Back to {service.name}
          </Link>
          <p className="text-sm font-bold uppercase tracking-widest text-[#ef3340]">
            Order &amp; Checkout
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#07152f] md:text-4xl">
            {service.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#10213f]">
            <span className="font-bold text-[#0047bb]">{service.price}</span>
            <span className="h-1 w-1 rounded-full bg-[#c8d9f5]" />
            <span className="flex items-center gap-1">
              <Clock aria-hidden="true" size={13} />
              {service.timing}
            </span>
          </div>
        </div>
      </div>

      <form
        className="mx-auto max-w-3xl px-5 py-10 lg:px-8"
        onSubmit={handleSubmit}
      >
        {/* Hero image strip */}
        <div className="relative mb-10 h-40 overflow-hidden rounded-xl shadow-md">
          <Image
            alt={service.name}
            className="object-cover"
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            src={service.heroImage}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07152f]/60 to-transparent" />
          <div className="absolute inset-0 flex items-center px-6">
            <p className="text-lg font-black text-white drop-shadow">{service.name}</p>
          </div>
        </div>

        {/* ── Section 1: Package ──────────────────────────────── */}
        <section className="mb-8">
          <SectionHeader icon={Package} title="Package Details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="package_type">
                Package type <span aria-hidden="true" className="text-[#ef3340]">*</span>
              </label>
              <select
                className={inputCls}
                id="package_type"
                required
                value={form.package_type}
                onChange={(e) => set("package_type", e.target.value)}
              >
                <option value="">Select type…</option>
                {PACKAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="weight">
                Weight <span aria-hidden="true" className="text-[#ef3340]">*</span>
              </label>
              <input
                className={inputCls}
                id="weight"
                placeholder="e.g. 1.5 kg"
                required
                type="text"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelCls} htmlFor="notes">
              Special instructions
            </label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              id="notes"
              placeholder="Fragile contents, leave with neighbour, access codes, etc."
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </section>

        <hr className="mb-8 border-slate-100" />

        {/* ── Section 2: Collection / sender ─────────────────── */}
        <section className="mb-8">
          <SectionHeader icon={User} title="Collection Details" />
          <div className="grid gap-4">
            <div>
              <label className={labelCls} htmlFor="sender_name">
                Your full name <span aria-hidden="true" className="text-[#ef3340]">*</span>
              </label>
              <input
                className={inputCls}
                id="sender_name"
                placeholder="Jane Smith"
                required
                type="text"
                value={form.sender_name}
                onChange={(e) => set("sender_name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="sender_address">
                Collection address <span aria-hidden="true" className="text-[#ef3340]">*</span>
              </label>
              <input
                className={inputCls}
                id="sender_address"
                placeholder="12 High Street"
                required
                type="text"
                value={form.sender_address}
                onChange={(e) => set("sender_address", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="sender_city">
                Collection city / town <span aria-hidden="true" className="text-[#ef3340]">*</span>
              </label>
              <input
                className={inputCls}
                id="sender_city"
                placeholder="London"
                required
                type="text"
                value={form.sender_city}
                onChange={(e) => set("sender_city", e.target.value)}
              />
            </div>
          </div>
        </section>

        <hr className="mb-8 border-slate-100" />

        {/* ── Section 3: Delivery / receiver ─────────────────── */}
        <section className="mb-8">
          <SectionHeader icon={MapPin} title="Delivery Details" />
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="receiver_name">
                  Recipient&apos;s full name <span aria-hidden="true" className="text-[#ef3340]">*</span>
                </label>
                <input
                  className={inputCls}
                  id="receiver_name"
                  placeholder="John Doe"
                  required
                  type="text"
                  value={form.receiver_name}
                  onChange={(e) => set("receiver_name", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="receiver_email">
                  Recipient&apos;s email <span aria-hidden="true" className="text-[#ef3340]">*</span>
                </label>
                <input
                  className={inputCls}
                  id="receiver_email"
                  placeholder="john@example.com"
                  required
                  type="email"
                  value={form.receiver_email}
                  onChange={(e) => set("receiver_email", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="receiver_address">
                Delivery address <span aria-hidden="true" className="text-[#ef3340]">*</span>
              </label>
              <input
                className={inputCls}
                id="receiver_address"
                placeholder="45 Oak Lane"
                required
                type="text"
                value={form.receiver_address}
                onChange={(e) => set("receiver_address", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="receiver_city">
                  Delivery city / town <span aria-hidden="true" className="text-[#ef3340]">*</span>
                </label>
                <input
                  className={inputCls}
                  id="receiver_city"
                  placeholder="Manchester"
                  required
                  type="text"
                  value={form.receiver_city}
                  onChange={(e) => set("receiver_city", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="receiver_postcode">
                  Postcode <span aria-hidden="true" className="text-[#ef3340]">*</span>
                </label>
                <input
                  className={inputCls}
                  id="receiver_postcode"
                  placeholder="M1 1AB"
                  required
                  type="text"
                  value={form.receiver_postcode}
                  onChange={(e) => set("receiver_postcode", e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <hr className="mb-8 border-slate-100" />

        {/* ── Section 4: Order summary / checkout ────────────── */}
        <section className="mb-8">
          <SectionHeader icon={CheckCircle2} title="Order Summary" />
          <div className="rounded-xl border border-[#c8d9f5] bg-[#f3f7ff] p-6 text-sm">
            <div className="grid gap-2.5">
              <Row label="Service" value={service.name} />
              <Row label="Price" value={service.price} highlight />
              <Row label="Estimated delivery" value={service.timing} />
            </div>

            {hasSummaryData && (
              <>
                <div className="my-4 border-t border-[#c8d9f5]" />
                <div className="grid gap-2.5">
                  {form.sender_name && (
                    <Row
                      label="From"
                      value={[form.sender_name, form.sender_city]
                        .filter(Boolean)
                        .join(", ")}
                    />
                  )}
                  {form.receiver_name && (
                    <Row
                      label="To"
                      value={[form.receiver_name, form.receiver_city]
                        .filter(Boolean)
                        .join(", ")}
                    />
                  )}
                  {form.receiver_email && (
                    <Row label="Recipient email" value={form.receiver_email} />
                  )}
                  {form.package_type && (
                    <Row
                      label="Package"
                      value={[form.package_type, form.weight]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <button
          className="w-full rounded-lg bg-[#0047bb] px-6 py-4 text-base font-bold text-white transition-colors hover:bg-[#003a9e] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Placing order…" : "Confirm Order"}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-[#50627f]">
          No payment is taken online. We will confirm your booking and send an invoice directly.
        </p>
      </form>
    </main>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-semibold text-[#334967]">{label}</span>
      <span
        className={`text-right ${highlight ? "font-bold text-[#0047bb]" : "text-[#07152f]"}`}
      >
        {value}
      </span>
    </div>
  );
}
