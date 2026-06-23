"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Package, RefreshCw, Search, Truck, Zap } from "lucide-react";
import type { Shipment, TrackingEvent } from "@/lib/types";
import { normaliseTrackingNumber } from "@/lib/tracking";
import { isMoving } from "@/lib/transit";
import { TrackingMap } from "./tracking-map";

export function TrackParcel({
  compact = false,
  initialTrackingNumber = "",
}: {
  compact?: boolean;
  initialTrackingNumber?: string;
}) {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const trackingRef = useRef(initialTrackingNumber);

  async function fetchShipment(tracking: string, silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(tracking)}`);
      const data = await res.json();
      if (res.ok) {
        setShipment(data.shipment);
        setLastRefreshed(new Date());
      } else if (!silent) {
        setError(data.error || "Tracking number not found. Please check and try again.");
      }
    } catch {
      if (!silent) setError("Unable to reach the tracking service. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Auto-search when a tracking number is passed in from the home page
  useEffect(() => {
    if (!initialTrackingNumber) return;
    const tracking = normaliseTrackingNumber(initialTrackingNumber);
    if (!tracking) return;
    trackingRef.current = tracking;
    void fetchShipment(tracking);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTrackingNumber]);

  // Poll every 30s when status is actively moving to catch admin status changes
  useEffect(() => {
    if (!shipment || !isMoving(shipment.current_status)) return;
    const id = setInterval(() => {
      const t = normaliseTrackingNumber(trackingRef.current);
      if (t) void fetchShipment(t, true);
    }, 30000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment?.current_status]);

  async function handleTrack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setShipment(null);
    const tracking = normaliseTrackingNumber(trackingNumber);
    if (!tracking) { setError("Please enter a tracking number."); return; }
    trackingRef.current = tracking;
    await fetchShipment(tracking);
  }

  return (
    <div
      className={
        compact ? "" : "rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleTrack}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Tracking number</span>
          <input
            className="h-12 w-full rounded-lg border border-slate-300 px-4 font-mono text-sm uppercase shadow-sm outline-none focus:border-[#0047bb]"
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="RR123456789GB"
            value={trackingNumber}
          />
        </label>
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0047bb] px-5 text-sm font-bold text-white hover:bg-[#003894]">
          <Search aria-hidden="true" size={18} />
          {loading ? "Tracking..." : "Track parcel"}
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {shipment ? (
        <>
          {isMoving(shipment.current_status) && lastRefreshed && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={11} className="animate-spin" />
              Auto-refreshing every 30s · Last updated {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(lastRefreshed)}
            </div>
          )}
          <TrackingResult shipment={shipment} />
        </>
      ) : null}
    </div>
  );
}

export function TrackingResult({ shipment }: { shipment: Shipment }) {
  const [historyOpen, setHistoryOpen] = useState(true);

  const events = [...(shipment.tracking_events || [])].sort((a, b) =>
    b.event_time.localeCompare(a.event_time),
  );

  const grouped = groupByDate(events);
  const statusMeta = getStatusMeta(shipment.current_status);

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
      {/* Status header */}
      <div className="border-b border-slate-200 bg-[#f7faff] px-6 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black text-[#07152f]">{statusMeta.headline}</h2>
          {isMoving(shipment.current_status) && shipment.live_tracking_enabled && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0047bb] px-3 py-1 text-xs font-bold text-white">
              <Zap size={11} className="animate-pulse" />
              Live tracking
            </span>
          )}
        </div>
        <div className="mt-3 flex items-start gap-3 rounded-lg border-l-4 border-[#ef3340] bg-white p-4 shadow-sm">
          <Package className="mt-0.5 shrink-0 text-[#ef3340]" size={20} />
          <p className="text-sm leading-6 text-[#10213f]">{statusMeta.message}</p>
        </div>
      </div>

      {/* Key details */}
      <div className="grid gap-5 border-b border-slate-200 px-6 py-5 sm:grid-cols-2">
        <DetailRow label="Tracking number" value={shipment.tracking_number} mono />
        <DetailRow label="Service used" value={shipment.delivery_service} />
        <DetailRow label="From" value={`${shipment.sender_name} · ${shipment.sender_city}`} />
        <DetailRow
          label="To"
          value={`${shipment.receiver_name} · ${shipment.receiver_city}, ${shipment.receiver_postcode}`}
        />
        <div className="sm:col-span-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#e8f1ff] px-4 py-2 text-sm font-bold text-[#0047bb]">
            <Truck aria-hidden="true" size={16} />
            Estimated delivery: {formatDate(shipment.estimated_delivery_date)}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="border-b border-slate-200 px-6 py-5">
        <TrackingMap shipment={shipment} />
      </div>

      {/* Tracking history */}
      <div className="px-6 py-5">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setHistoryOpen((o) => !o)}
          type="button"
        >
          <h3 className="text-xl font-black text-[#07152f]">Tracking history</h3>
          {historyOpen ? (
            <ChevronUp className="text-[#ef3340]" size={22} />
          ) : (
            <ChevronDown className="text-[#ef3340]" size={22} />
          )}
        </button>

        {historyOpen && (
          <div className="mt-5">
            {grouped.length ? (
              grouped.map(({ dateLabel, events: dayEvents }) => (
                <div className="mb-6 last:mb-0" key={dateLabel}>
                  <p className="mb-3 text-sm font-bold text-slate-500">
                    {dateLabel}
                  </p>
                  <div className="grid gap-4">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="w-14 shrink-0 text-right font-mono text-sm font-semibold text-slate-500">
                          {formatTime(event.event_time)}
                        </div>
                        <div className="relative pl-5 before:absolute before:left-0 before:top-0 before:h-full before:w-0.5 before:bg-[#c8d9f5]">
                          <p className="font-bold text-[#07152f]">{event.status}</p>
                          {event.location && (
                            <p className="mt-0.5 text-sm text-slate-500">
                              {event.location}
                            </p>
                          )}
                          {event.description && (
                            <p className="mt-1 text-sm text-[#10213f]">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-[#f7faff] p-4 text-sm text-[#1f3556]">
                No tracking updates have been added yet.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-bold text-[#07152f] ${mono ? "font-mono tracking-wider" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function groupByDate(events: TrackingEvent[]) {
  const map = new Map<string, TrackingEvent[]>();
  for (const event of events) {
    const key = formatDateFull(event.event_time);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  }
  return Array.from(map.entries()).map(([dateLabel, evts]) => ({
    dateLabel,
    events: evts,
  }));
}

function formatDateFull(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getStatusMeta(status: string): { headline: string; message: string } {
  switch (status) {
    case "Shipment Created":
      return {
        headline: "We've got it",
        message:
          "We have your item and it's on its way. More information will be available as it travels through our network.",
      };
    case "Parcel Collected":
      return {
        headline: "Parcel collected",
        message:
          "Your parcel has been collected and is now in our network. We'll update you as it moves.",
      };
    case "At Local Depot":
      return {
        headline: "At local depot",
        message:
          "Your parcel is at a local TBC depot and will be processed shortly.",
      };
    case "In Transit":
      return {
        headline: "On its way",
        message:
          "Your parcel is in transit and moving towards its destination. Check back for the latest updates.",
      };
    case "Arrived at Sorting Facility":
      return {
        headline: "At sorting facility",
        message:
          "Your parcel has arrived at a sorting facility and will be dispatched for delivery soon.",
      };
    case "Customs/Processing Check":
      return {
        headline: "Customs check",
        message:
          "Your parcel is undergoing a customs or processing check. This is a standard step and should be completed shortly.",
      };
    case "Out for Delivery":
      return {
        headline: "Out for delivery",
        message:
          "Great news! Your parcel is out for delivery today. Please ensure someone is available to receive it.",
      };
    case "Delivery Attempted":
      return {
        headline: "Delivery attempted",
        message:
          "We tried to deliver your parcel but were unable to complete delivery. Please check your notes for next steps.",
      };
    case "Delivered":
      return {
        headline: "Delivered",
        message:
          "Your parcel has been successfully delivered. Thank you for choosing TBC.",
      };
    case "On Hold":
      return {
        headline: "On hold",
        message:
          "Your parcel is currently on hold. Please contact TBC support for more information.",
      };
    default:
      return {
        headline: status,
        message:
          "Your parcel is being processed. More updates will follow as it travels through our network.",
      };
  }
}
