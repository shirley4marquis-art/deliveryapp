"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  Box,
  CalendarDays,
  Mail,
  MapPinned,
  PackageCheck,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { parcelStatuses, type ParcelStatus, type Shipment } from "@/lib/types";
import {
  getShipmentSource,
  sourceLabel,
  type ShipmentSource,
} from "@/lib/shipment-source";

type SortOrder = "newest" | "oldest" | "customer" | "eta";
type EmailType =
  | "status"
  | "vat"
  | "address"
  | "scheduled"
  | "attempted"
  | "custom";

type EmailDraft = {
  shipment: Shipment;
  type: EmailType;
  subject: string;
  message: string;
};

const emailTypes: Array<{ value: EmailType; label: string }> = [
  { value: "status", label: "Shipment status update" },
  { value: "vat", label: "£110 VAT/payment notice" },
  { value: "address", label: "Confirm delivery address" },
  { value: "scheduled", label: "Delivery scheduled" },
  { value: "attempted", label: "Delivery attempted" },
  { value: "custom", label: "Custom email" },
];

export function SourceOrdersDashboard({
  source,
}: {
  source: ShipmentSource;
}) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ParcelStatus | "all">("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadShipments = useCallback(async () => {
    const response = await fetch("/api/admin/shipments");
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Unable to load orders.");
      return;
    }
    setShipments(
      ((data.shipments || []) as Shipment[]).filter(
        (shipment) => getShipmentSource(shipment) === source,
      ),
    );
  }, [source]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadShipments(), 0);
    return () => window.clearTimeout(timer);
  }, [loadShipments]);

  function openEmailDraft(shipment: Shipment, type: EmailType) {
    if (!shipment.receiver_email) {
      setMessage("");
      setError("Add the receiver email address before preparing an email.");
      return;
    }
    setEmailDraft(createEmailDraft(shipment, type));
    setError("");
    setMessage("");
  }

  async function sendDraftEmail() {
    if (!emailDraft) return;
    setSendingEmail(true);
    const response = await fetch("/api/admin/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipment_id: emailDraft.shipment.id,
        template_type: emailDraft.type,
        subject: emailDraft.subject,
        message: emailDraft.message,
        charge_amount: "110.00",
      }),
    });
    const data = await response.json();
    setSendingEmail(false);

    if (!response.ok) {
      setError(data.error || "Unable to send the email.");
      return;
    }

    const typeLabel =
      emailTypes.find((item) => item.value === emailDraft.type)?.label ||
      "Email";
    setMessage(
      `${typeLabel} sent directly to ${emailDraft.shipment.receiver_email}.`,
    );
    setEmailDraft(null);
    await loadShipments();
  }

  const visibleShipments = useMemo(() => {
    const term = query.trim().toLowerCase();
    return shipments
      .filter((shipment) => status === "all" || shipment.current_status === status)
      .filter((shipment) =>
        !term
          ? true
          : [
              shipment.tracking_number,
              shipment.external_order_id,
              shipment.receiver_name,
              shipment.receiver_email,
              shipment.receiver_city,
              shipment.receiver_postcode,
              shipment.package_type,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term),
      )
      .sort((a, b) => compareShipments(a, b, sort));
  }, [query, shipments, sort, status]);

  const groupedShipments = useMemo(
    () =>
      parcelStatuses
        .map((groupStatus) => ({
          status: groupStatus,
          shipments: visibleShipments.filter(
            (shipment) => shipment.current_status === groupStatus,
          ),
        }))
        .filter((group) => group.shipments.length),
    [visibleShipments],
  );

  const delivered = shipments.filter(
    (shipment) => shipment.current_status === "Delivered",
  ).length;
  const active = shipments.filter(
    (shipment) =>
      shipment.current_status !== "Delivered" &&
      shipment.current_status !== "On Hold",
  ).length;
  const onHold = shipments.filter(
    (shipment) => shipment.current_status === "On Hold",
  ).length;
  const label = sourceLabel(source);
  const accent =
    source === "ruco"
      ? "from-amber-500 to-yellow-600"
      : "from-emerald-600 to-green-700";

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:px-8">
      <header
        className={`rounded-2xl bg-gradient-to-br ${accent} p-6 text-white shadow-lg`}
      >
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white"
          href="/admin"
        >
          <ArrowLeft size={16} /> Back to admin dashboard
        </Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">
              Shipment source
            </p>
            <h1 className="mt-2 text-3xl font-black">{label} orders</h1>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-white/85">
              View individual orders, organise them by shipment status, and open
              each tracking workspace.
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black">
            {shipments.length} total orders
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Box size={20} />} label="All orders" value={shipments.length} />
        <SummaryCard icon={<MapPinned size={20} />} label="Active" value={active} />
        <SummaryCard icon={<PackageCheck size={20} />} label="Delivered" value={delivered} />
        <SummaryCard icon={<CalendarDays size={20} />} label="On hold" value={onHold} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_240px_220px]">
          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-300 px-4 focus-within:border-[#0047bb]">
            <Search className="text-slate-500" size={18} />
            <input
              className="min-w-0 flex-1 outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, customer, tracking number…"
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              className="h-12 w-full rounded-xl border border-slate-300 px-3 font-semibold outline-none focus:border-[#0047bb]"
              onChange={(event) =>
                setStatus(event.target.value as ParcelStatus | "all")
              }
              value={status}
            >
              <option value="all">All shipment statuses</option>
              {parcelStatuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <ArrowUpDown
              className="pointer-events-none absolute left-3 top-3.5 text-slate-500"
              size={18}
            />
            <span className="sr-only">Sort orders</span>
            <select
              className="h-12 w-full rounded-xl border border-slate-300 pl-10 pr-3 font-semibold outline-none focus:border-[#0047bb]"
              onChange={(event) => setSort(event.target.value as SortOrder)}
              value={sort}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="customer">Customer A–Z</option>
              <option value="eta">Delivery date</option>
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
          {message}
        </p>
      ) : null}

      {emailDraft ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#07152f]/70 p-4">
          <section
            aria-labelledby="order-email-title"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0047bb]">
                  Send directly to customer
                </p>
                <h2
                  className="mt-2 text-2xl font-black text-[#07152f]"
                  id="order-email-title"
                >
                  Email {emailDraft.shipment.receiver_name}
                </h2>
                <p className="mt-1 text-sm text-[#50627f]">
                  {emailDraft.shipment.receiver_email} ·{" "}
                  {emailDraft.shipment.tracking_number}
                </p>
              </div>
              <button
                aria-label="Close email draft"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                onClick={() => setEmailDraft(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-bold text-[#10213f]">Email type</span>
              <select
                className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 font-semibold outline-none focus:border-[#0047bb]"
                onChange={(event) =>
                  setEmailDraft(
                    createEmailDraft(
                      emailDraft.shipment,
                      event.target.value as EmailType,
                    ),
                  )
                }
                value={emailDraft.type}
              >
                {emailTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            {emailDraft.type === "vat" ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                Sending this draft places the shipment On Hold and records the
                £110 VAT tracking event.
              </p>
            ) : null}

            <label className="mt-4 block">
              <span className="text-sm font-bold text-[#10213f]">Subject</span>
              <input
                className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-4 outline-none focus:border-[#0047bb]"
                onChange={(event) =>
                  setEmailDraft({ ...emailDraft, subject: event.target.value })
                }
                value={emailDraft.subject}
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold text-[#10213f]">
                Editable message
              </span>
              <textarea
                className="mt-2 min-h-80 w-full rounded-lg border border-slate-300 p-4 text-sm leading-6 outline-none focus:border-[#0047bb]"
                onChange={(event) =>
                  setEmailDraft({ ...emailDraft, message: event.target.value })
                }
                value={emailDraft.message}
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold"
                onClick={() => setEmailDraft(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-[#0047bb] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                disabled={
                  sendingEmail ||
                  !emailDraft.subject.trim() ||
                  !emailDraft.message.trim()
                }
                onClick={() => void sendDraftEmail()}
                type="button"
              >
                <Mail size={16} />
                {sendingEmail ? "Sending…" : "Send email"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl bg-white p-6 shadow-sm">
          <span className="h-6 w-6 animate-spin rounded-full border-4 border-[#c8d9f5] border-t-[#0047bb]" />
          <p className="font-semibold text-[#10213f]">Loading {label} orders…</p>
        </div>
      ) : null}

      {!loading
        ? groupedShipments.map((group) => (
            <StatusGroup
              key={group.status}
              onOpenEmail={openEmailDraft}
              shipments={group.shipments}
              status={group.status}
            />
          ))
        : null}

      {!loading && !visibleShipments.length ? (
        <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-black text-[#07152f]">No matching orders</h2>
          <p className="mt-2 text-sm text-[#50627f]">
            Adjust the status filter or search term to see more {label} shipments.
          </p>
        </section>
      ) : null}
    </main>
  );
}

function StatusGroup({
  status,
  shipments,
  onOpenEmail,
}: {
  status: ParcelStatus;
  shipments: Shipment[];
  onOpenEmail: (shipment: Shipment, type: EmailType) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#f7faff] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${statusColour(status)}`} />
          <h2 className="text-lg font-black text-[#07152f]">{status}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#50627f] shadow-sm">
          {shipments.length} {shipments.length === 1 ? "order" : "orders"}
        </span>
      </div>
      <div className="grid gap-3 p-4">
        {shipments.map((shipment) => (
          <article
            className="grid gap-4 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1.1fr_1fr_0.8fr_auto] lg:items-center"
            key={shipment.id}
          >
            <div>
              <p className="font-mono text-sm font-black text-[#0047bb]">
                {shipment.tracking_number}
              </p>
              {shipment.external_order_id ? (
                <p className="mt-1 text-xs font-semibold text-[#50627f]">
                  Order {shipment.external_order_id}
                </p>
              ) : null}
            </div>
            <div>
              <p className="flex items-center gap-2 font-black text-[#07152f]">
                <UserRound size={15} /> {shipment.receiver_name}
              </p>
              <p className="mt-1 text-sm text-[#50627f]">
                {[shipment.receiver_city, shipment.receiver_postcode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-[#07152f]">
                {shipment.package_type}
              </p>
              <p className="mt-1 text-xs text-[#50627f]">
                ETA {formatDate(shipment.estimated_delivery_date)}
              </p>
            </div>
            <div className="grid gap-2">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0047bb] px-4 py-2.5 text-sm font-black text-white"
                href={`/admin/tracking/${shipment.id}`}
              >
                <MapPinned size={16} /> Manage tracking
              </Link>
              <label className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-3 text-[#0047bb]"
                  size={16}
                />
                <span className="sr-only">Choose customer email type</span>
                <select
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-[#0047bb] bg-white pl-9 pr-7 text-sm font-black text-[#0047bb] disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue=""
                  disabled={!shipment.receiver_email}
                  onChange={(event) => {
                    if (event.target.value) {
                      onOpenEmail(shipment, event.target.value as EmailType);
                      event.target.value = "";
                    }
                  }}
                  title={
                    shipment.receiver_email
                      ? `Prepare an email for ${shipment.receiver_email}`
                      : "Add a receiver email before sending"
                  }
                >
                  <option disabled value="">
                    Send email…
                  </option>
                  {emailTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 text-[#0047bb]">
        {icon}
        <p className="text-sm font-bold text-[#50627f]">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-black text-[#07152f]">{value}</p>
    </article>
  );
}

function compareShipments(a: Shipment, b: Shipment, sort: SortOrder) {
  if (sort === "customer") {
    return a.receiver_name.localeCompare(b.receiver_name);
  }
  if (sort === "eta") {
    return a.estimated_delivery_date.localeCompare(b.estimated_delivery_date);
  }
  const aTime = new Date(a.created_at || 0).getTime();
  const bTime = new Date(b.created_at || 0).getTime();
  return sort === "oldest" ? aTime - bTime : bTime - aTime;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function statusColour(status: ParcelStatus) {
  if (status === "Delivered") return "bg-green-500";
  if (status === "On Hold" || status === "Delivery Attempted") return "bg-red-500";
  if (status === "Customs/Processing Check") return "bg-amber-500";
  if (status === "Shipment Created") return "bg-slate-400";
  return "bg-blue-500";
}

function createEmailDraft(shipment: Shipment, type: EmailType): EmailDraft {
  const name = shipment.receiver_name || "Customer";
  const tracking = shipment.tracking_number;
  const eta = formatDate(shipment.estimated_delivery_date);
  const address = [
    shipment.receiver_address,
    shipment.receiver_city,
    shipment.receiver_postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const drafts: Record<EmailType, { subject: string; message: string }> = {
    status: {
      subject: `Shipment update — ${tracking}`,
      message: `Dear ${name},

We are writing with an update about your shipment ${tracking}.

Current status: ${shipment.current_status}
Estimated delivery: ${eta}

You can use the tracking button in this email to view the latest delivery information.

Kind regards,
Royal Runs Delivery`,
    },
    vat: {
      subject: `Action Required — Import VAT Due | Ref: ${tracking}`,
      message: `Dear ${name},

Your shipment ${tracking} is currently being held while the mandatory import VAT assessment is completed.

An outstanding VAT settlement of £110.00 must be completed before the parcel can be released for onward delivery.

Please contact the sender to arrange settlement and quote tracking reference ${tracking} in all correspondence. Once payment is confirmed, the hold will be removed and delivery will continue.

Kind regards,
Royal Runs Delivery
Customs & Clearance Team`,
    },
    address: {
      subject: `Please confirm your delivery address | Ref: ${tracking}`,
      message: `Dear ${name},

Please confirm that the delivery address below is correct for shipment ${tracking}:

${address}

If any detail is incorrect, reply to this email as soon as possible so it can be reviewed before dispatch.

Kind regards,
Royal Runs Delivery`,
    },
    scheduled: {
      subject: `Delivery scheduled for your shipment | Ref: ${tracking}`,
      message: `Dear ${name},

Your shipment ${tracking} is scheduled for delivery.

Estimated delivery date: ${eta}
Delivery address: ${address}

Please ensure someone is available to receive the parcel.

Kind regards,
Royal Runs Delivery`,
    },
    attempted: {
      subject: `Delivery attempt update | Ref: ${tracking}`,
      message: `Dear ${name},

We attempted to deliver shipment ${tracking}, but the delivery could not be completed.

Please reply to this email or contact Royal Runs Delivery support to confirm the next available delivery arrangement.

Kind regards,
Royal Runs Delivery`,
    },
    custom: {
      subject: `Royal Runs Delivery | Ref: ${tracking}`,
      message: `Dear ${name},



Kind regards,
Royal Runs Delivery`,
    },
  };

  return { shipment, type, ...drafts[type] };
}
