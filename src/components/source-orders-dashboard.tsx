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
} from "lucide-react";
import { parcelStatuses, type ParcelStatus, type Shipment } from "@/lib/types";
import {
  getShipmentSource,
  sourceLabel,
  type ShipmentSource,
} from "@/lib/shipment-source";

type SortOrder = "newest" | "oldest" | "customer" | "eta";

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
  const [sendingVat, setSendingVat] = useState("");

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

  async function sendVatEmail(shipment: Shipment) {
    if (!shipment.receiver_email) {
      setMessage("");
      setError("Add the receiver email address before sending a VAT message.");
      return;
    }

    const confirmed = window.confirm(
      `Send the £110 import VAT email directly to ${shipment.receiver_email} and place this shipment on hold?\n\nReceiver: ${shipment.receiver_name}\nTracking: ${shipment.tracking_number}`,
    );
    if (!confirmed) return;

    setSendingVat(shipment.id);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/send-customs-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipment_id: shipment.id,
        charge_amount: "110.00",
      }),
    });
    const data = await response.json();
    setSendingVat("");

    if (!response.ok) {
      setError(data.error || "Unable to send the VAT email.");
      return;
    }

    setMessage(
      `The £110 VAT email was sent directly to ${shipment.receiver_email}.`,
    );
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
              onSendVat={sendVatEmail}
              sendingVat={sendingVat}
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
  onSendVat,
  sendingVat,
}: {
  status: ParcelStatus;
  shipments: Shipment[];
  onSendVat?: (shipment: Shipment) => Promise<void>;
  sendingVat: string;
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
              {onSendVat ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    sendingVat === shipment.id || !shipment.receiver_email
                  }
                  onClick={() => void onSendVat(shipment)}
                  title={
                    shipment.receiver_email
                      ? `Send the VAT message to ${shipment.receiver_email}`
                      : "Add a receiver email before sending"
                  }
                  type="button"
                >
                  <Mail size={16} />
                  {sendingVat === shipment.id
                    ? "Sending…"
                    : shipment.current_status === "On Hold"
                      ? "Resend £110 VAT email"
                      : "Send £110 VAT email"}
                </button>
              ) : null}
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
