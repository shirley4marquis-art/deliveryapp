"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  Mail,
  Pause,
  Play,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { AdminRouteMap } from "@/components/admin-route-map";
import { CustomerEmailHistory } from "@/components/customer-email-history";
import { ShipmentEmailAutomation } from "@/components/shipment-email-automation";
import {
  parcelStatuses,
  type CustomerEmailLog,
  type ParcelStatus,
  type Shipment,
  type TrackingEvent,
} from "@/lib/types";

type ShipmentForm = {
  tracking_number: string;
  sender_name: string;
  sender_address: string;
  sender_city: string;
  sender_place_id: string;
  receiver_name: string;
  receiver_email: string;
  receiver_address: string;
  receiver_city: string;
  receiver_postcode: string;
  receiver_place_id: string;
  package_type: string;
  weight: string;
  delivery_service: string;
  current_status: ParcelStatus;
  estimated_delivery_date: string;
  notes: string;
  created_at: string;
  pickup_lat: string;
  pickup_lng: string;
  delivery_lat: string;
  delivery_lng: string;
  current_lat: string;
  current_lng: string;
};

type EventForm = {
  event_date: string;
  event_clock: string;
  location: string;
  status: ParcelStatus;
  description: string;
};

const emptyEvent = (): EventForm => ({
  event_date: new Date().toISOString().slice(0, 10),
  event_clock: new Date().toTimeString().slice(0, 5),
  location: "",
  status: "In Transit",
  description: "",
});

export function TrackingEditor({ shipmentId }: { shipmentId: string }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [form, setForm] = useState<ShipmentForm | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEvent);
  const [editingEventId, setEditingEventId] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [emailLogs, setEmailLogs] = useState<CustomerEmailLog[]>([]);

  const loadShipment = useCallback(async () => {
    const response = await fetch(`/api/admin/shipments/${shipmentId}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to load this shipment.");
      return;
    }
    const nextShipment = data.shipment as Shipment;
    setShipment(nextShipment);
    setForm(toShipmentForm(nextShipment));
    if (nextShipment.receiver_email) {
      const historyResponse = await fetch(
        `/api/admin/email-history?email=${encodeURIComponent(nextShipment.receiver_email)}`,
      );
      const historyData = await historyResponse.json();
      if (historyResponse.ok) {
        setEmailLogs((historyData.logs || []) as CustomerEmailLog[]);
      }
    } else {
      setEmailLogs([]);
    }
  }, [shipmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadShipment(), 0);
    return () => window.clearTimeout(timer);
  }, [loadShipment]);

  function notify(text: string, tone: "success" | "error" = "success") {
    setMessage(tone === "success" ? text : "");
    setError(tone === "error" ? text : "");
  }

  async function saveShipment(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy("shipment");
    notify("");
    const response = await fetch(`/api/admin/shipments/${shipmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        created_at: new Date(form.created_at).toISOString(),
      }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      notify(data.error || "Unable to save tracking details.", "error");
      return;
    }
    await loadShipment();
    notify("Tracking details saved to Supabase.");
  }

  async function saveEvent(event: React.FormEvent) {
    event.preventDefault();
    setBusy("event");
    notify("");
    const response = await fetch(
      editingEventId
        ? `/api/admin/tracking-events/${editingEventId}`
        : `/api/admin/shipments/${shipmentId}`,
      {
        method: editingEventId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      },
    );
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      notify(data.error || "Unable to save the timeline update.", "error");
      return;
    }
    setEditingEventId("");
    setEventForm(emptyEvent());
    await loadShipment();
    notify(editingEventId ? "Timeline update changed." : "Timeline update added.");
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm("Delete this tracking update?")) return;
    setBusy(eventId);
    const response = await fetch(`/api/admin/tracking-events/${eventId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      notify(data.error || "Unable to delete the timeline update.", "error");
      return;
    }
    await loadShipment();
    notify("Timeline update deleted.");
  }

  function editEvent(item: TrackingEvent) {
    const date = new Date(item.event_time);
    setEditingEventId(item.id);
    setEventForm({
      event_date: date.toISOString().slice(0, 10),
      event_clock: date.toTimeString().slice(0, 5),
      location: item.location,
      status: item.status,
      description: item.description || "",
    });
    document.getElementById("timeline-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function uploadImage() {
    if (!image) return;
    setBusy("image");
    const body = new FormData();
    body.set("image", image);
    const response = await fetch(
      `/api/admin/shipments/${shipmentId}/package-image`,
      { method: "POST", body },
    );
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      notify(data.error || "Unable to upload the package image.", "error");
      return;
    }
    setImage(null);
    await loadShipment();
    notify("Package image saved to Supabase Storage.");
  }

  async function removeImage() {
    if (!window.confirm("Remove this package image from tracking?")) return;
    setBusy("image");
    const response = await fetch(
      `/api/admin/shipments/${shipmentId}/package-image`,
      { method: "DELETE" },
    );
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      notify(data.error || "Unable to remove the package image.", "error");
      return;
    }
    await loadShipment();
    notify("Package image removed.");
  }

  async function sendVatEmail() {
    if (!shipment?.receiver_email) {
      notify("Add the receiver email address before sending a VAT message.", "error");
      return;
    }
    if (
      !window.confirm(
        `Send the £110 import VAT email directly to ${shipment.receiver_email} and place this shipment on hold?`,
      )
    ) {
      return;
    }

    setBusy("vat-email");
    notify("");
    const response = await fetch("/api/admin/send-customs-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipment_id: shipment.id,
        charge_amount: "110.00",
      }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      notify(data.error || "Unable to send the VAT email.", "error");
      return;
    }
    await loadShipment();
    notify(`The £110 VAT email was sent directly to ${shipment.receiver_email}.`);
  }

  async function controlLiveTracking(action: "pause" | "resume") {
    setBusy("live-tracking");
    notify("");
    const response = await fetch(`/api/admin/shipments/${shipmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: `${action}-live-tracking` }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      notify(data.error || `Unable to ${action} live tracking.`, "error");
      return;
    }
    const nextShipment = data.shipment as Shipment;
    setShipment(nextShipment);
    setForm(toShipmentForm(nextShipment));
    notify(`Live tracking ${action === "pause" ? "paused" : "resumed"} at 25 km/h.`);
  }

  if (!form || !shipment) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {error ? <Alert tone="error">{error}</Alert> : <p>Loading tracking editor…</p>}
      </main>
    );
  }

  const timeline = [...(shipment.tracking_events || [])].sort((a, b) =>
    b.event_time.localeCompare(a.event_time),
  );

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:px-8">
      <header className="rounded-2xl bg-[#07152f] p-6 text-white shadow-lg">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-200 hover:text-white"
          href="/admin"
        >
          <ArrowLeft size={16} /> Back to shipments
        </Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Tracking workspace
            </p>
            <h1 className="mt-2 text-3xl font-black">{shipment.tracking_number}</h1>
            <p className="mt-1 text-blue-100">
              {shipment.receiver_name} · {shipment.current_status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-white disabled:opacity-50 ${
                shipment.live_tracking_enabled ? "bg-amber-600" : "bg-green-600"
              }`}
              disabled={busy === "live-tracking"}
              onClick={() =>
                void controlLiveTracking(
                  shipment.live_tracking_enabled ? "pause" : "resume",
                )
              }
              type="button"
            >
              {shipment.live_tracking_enabled ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
              {busy === "live-tracking"
                ? "Updating…"
                : shipment.live_tracking_enabled
                  ? "Pause live tracking"
                  : "Resume at 25 km/h"}
            </button>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fff1cc] px-4 py-3 text-sm font-black text-[#07152f]"
              href={`/admin/labels/${shipment.id}`}
            >
              <Printer size={16} /> Create shipping label
            </Link>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              disabled={busy === "vat-email" || !shipment.receiver_email}
              onClick={() => void sendVatEmail()}
              type="button"
            >
              <Mail size={16} />
              {busy === "vat-email"
                ? "Sending VAT email…"
                : shipment.current_status === "On Hold"
                  ? "Resend £110 VAT email"
                  : "Send £110 VAT email"}
            </button>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-[#0047bb]"
              href={`/track?q=${encodeURIComponent(shipment.tracking_number)}`}
              target="_blank"
            >
              View customer tracking <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </header>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <form
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={saveShipment}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#07152f]">Shipment details</h2>
              <p className="mt-1 text-sm text-[#50627f]">
                These changes update the customer’s live tracking record.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-[#0047bb] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              disabled={busy === "shipment"}
            >
              <Save size={16} /> {busy === "shipment" ? "Saving…" : "Save"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Tracking number" value={form.tracking_number} onChange={(value) => setForm({ ...form, tracking_number: value.toUpperCase() })} />
            <Field label="Created date and time" type="datetime-local" value={form.created_at} onChange={(value) => setForm({ ...form, created_at: value })} />
            <Field label="Sender name" value={form.sender_name} onChange={(value) => setForm({ ...form, sender_name: value })} />
            <Field label="Sender address" value={form.sender_address} onChange={(value) => setForm({ ...form, sender_address: value })} />
            <Field label="Sender city" value={form.sender_city} onChange={(value) => setForm({ ...form, sender_city: value })} />
            <Field label="Receiver name" value={form.receiver_name} onChange={(value) => setForm({ ...form, receiver_name: value })} />
            <Field label="Receiver email" required={false} type="email" value={form.receiver_email} onChange={(value) => setForm({ ...form, receiver_email: value })} />
            <Field label="Receiver address" value={form.receiver_address} onChange={(value) => setForm({ ...form, receiver_address: value })} />
            <Field label="Receiver city" value={form.receiver_city} onChange={(value) => setForm({ ...form, receiver_city: value })} />
            <Field label="Postcode" required={false} value={form.receiver_postcode} onChange={(value) => setForm({ ...form, receiver_postcode: value.toUpperCase() })} />
            <Field label="Package type" value={form.package_type} onChange={(value) => setForm({ ...form, package_type: value })} />
            <Field label="Weight" value={form.weight} onChange={(value) => setForm({ ...form, weight: value })} />
            <Field label="Delivery service" value={form.delivery_service} onChange={(value) => setForm({ ...form, delivery_service: value })} />
            <Field label="Estimated delivery" type="date" value={form.estimated_delivery_date} onChange={(value) => setForm({ ...form, estimated_delivery_date: value })} />
            <StatusField value={form.current_status} onChange={(value) => setForm({ ...form, current_status: value })} />
            <Field label="Admin notes" required={false} value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
          </div>

          <div className="mt-6 rounded-xl border border-[#c8d9f5] bg-[#f7faff] p-4">
            <h3 className="font-black text-[#07152f]">Route and current position</h3>
            <p className="mt-1 text-sm text-[#50627f]">
              Live movement follows the sender-to-receiver route at 25 km/h.
              Pause tracking, drag the amber marker to adjust the parcel, save,
              then resume from the new position.
            </p>
            <div className="mt-4">
              <AdminRouteMap
                currentLat={form.current_lat}
                currentLng={form.current_lng}
                deliveryLat={form.delivery_lat}
                deliveryLng={form.delivery_lng}
                onCurrentLocationChange={(lat, lng) =>
                  setForm({ ...form, current_lat: lat, current_lng: lng })
                }
                pickupLat={form.pickup_lat}
                pickupLng={form.pickup_lng}
              />
            </div>
          </div>
        </form>

        <aside className="grid content-start gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#07152f]">
              Customer communication
            </h2>
            <p className="mt-1 mb-4 text-sm text-[#50627f]">
              Email activity for {shipment.receiver_email || "this customer"}
              across all shipments.
            </p>
            <ShipmentEmailAutomation shipmentId={shipment.id} />
            <CustomerEmailHistory
              logs={emailLogs}
              status={shipment.current_status}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-[#07152f]">
                <ImagePlus size={20} /> Package image
              </h2>
              <p className="mt-1 text-sm text-[#50627f]">
                Preview, add, replace, or remove the image stored in Supabase.
              </p>
            </div>
            {shipment.package_image_url ? (
              <a href={shipment.package_image_url} rel="noreferrer" target="_blank">
                {/* Supabase owns this dynamic image URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Package for ${shipment.tracking_number}`}
                  className="max-h-96 w-full border-y border-slate-200 bg-slate-50 object-contain"
                  src={shipment.package_image_url}
                />
              </a>
            ) : (
              <div className="mx-5 flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
                No package image
              </div>
            )}
            <div className="grid gap-3 p-5">
              <input
                accept="image/*"
                className="block w-full text-sm"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
                type="file"
              />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0047bb] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                disabled={!image || busy === "image"}
                onClick={() => void uploadImage()}
                type="button"
              >
                <Upload size={16} />
                {busy === "image"
                  ? "Updating…"
                  : shipment.package_image_url
                    ? "Replace image"
                    : "Upload image"}
              </button>
              {shipment.package_image_url ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-black text-red-700"
                  onClick={() => void removeImage()}
                  type="button"
                >
                  <Trash2 size={16} /> Remove image
                </button>
              ) : null}
              <p className="text-xs text-[#50627f]">Any image format · 10 MB maximum</p>
            </div>
          </section>

          <form
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            id="timeline-form"
            onSubmit={saveEvent}
          >
            <h2 className="text-xl font-black text-[#07152f]">
              {editingEventId ? "Edit timeline update" : "Add timeline update"}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Date" type="date" value={eventForm.event_date} onChange={(value) => setEventForm({ ...eventForm, event_date: value })} />
              <Field label="Time" type="time" value={eventForm.event_clock} onChange={(value) => setEventForm({ ...eventForm, event_clock: value })} />
            </div>
            <Field label="Location" value={eventForm.location} onChange={(value) => setEventForm({ ...eventForm, location: value })} />
            <StatusField label="Event status" value={eventForm.status} onChange={(value) => setEventForm({ ...eventForm, status: value })} />
            <Field label="Description" required={false} value={eventForm.description} onChange={(value) => setEventForm({ ...eventForm, description: value })} />
            <div className="mt-5 flex gap-2">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#ef3340] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                disabled={busy === "event"}
              >
                {editingEventId ? <Save size={16} /> : <Plus size={16} />}
                {busy === "event" ? "Saving…" : editingEventId ? "Save update" : "Add update"}
              </button>
              {editingEventId ? (
                <button
                  className="rounded-lg border border-slate-300 px-4 text-sm font-bold"
                  onClick={() => {
                    setEditingEventId("");
                    setEventForm(emptyEvent());
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[#07152f]">Tracking timeline</h2>
          <p className="mt-1 text-sm text-[#50627f]">
            Every saved update shown on the customer tracking page.
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          {timeline.map((item) => (
            <article
              className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-[180px_1fr_auto] md:items-center"
              key={item.id}
            >
              <div>
                <p className="font-black text-[#07152f]">
                  {new Date(item.event_time).toLocaleDateString("en-GB")}
                </p>
                <p className="text-sm text-[#50627f]">
                  {new Date(item.event_time).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="font-black text-[#0047bb]">{item.status}</p>
                <p className="text-sm font-semibold text-[#07152f]">{item.location}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-[#50627f]">{item.description}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"
                  onClick={() => editEvent(item)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  aria-label="Delete tracking update"
                  className="rounded-lg border border-red-200 p-2 text-red-700"
                  disabled={busy === item.id}
                  onClick={() => void deleteEvent(item.id)}
                  type="button"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
          {!timeline.length ? (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-[#50627f]">
              No timeline updates have been added.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function toShipmentForm(shipment: Shipment): ShipmentForm {
  return {
    tracking_number: shipment.tracking_number,
    sender_name: shipment.sender_name,
    sender_address: shipment.sender_address,
    sender_city: shipment.sender_city,
    sender_place_id: shipment.sender_place_id || "",
    receiver_name: shipment.receiver_name,
    receiver_email: shipment.receiver_email || "",
    receiver_address: shipment.receiver_address,
    receiver_city: shipment.receiver_city,
    receiver_postcode: shipment.receiver_postcode,
    receiver_place_id: shipment.receiver_place_id || "",
    package_type: shipment.package_type,
    weight: shipment.weight,
    delivery_service: shipment.delivery_service,
    current_status: shipment.current_status,
    estimated_delivery_date: shipment.estimated_delivery_date,
    notes: shipment.notes || "",
    created_at: toDatetimeLocal(shipment.created_at),
    pickup_lat: coordinate(shipment.pickup_lat),
    pickup_lng: coordinate(shipment.pickup_lng),
    delivery_lat: coordinate(shipment.delivery_lat),
    delivery_lng: coordinate(shipment.delivery_lng),
    current_lat: coordinate(shipment.current_lat),
    current_lng: coordinate(shipment.current_lng),
  };
}

function toDatetimeLocal(value?: string) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function coordinate(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#10213f]">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#0047bb]"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function StatusField({
  label = "Current status",
  value,
  onChange,
}: {
  label?: string;
  value: ParcelStatus;
  onChange: (value: ParcelStatus) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#10213f]">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#0047bb]"
        onChange={(event) => onChange(event.target.value as ParcelStatus)}
        value={value}
      >
        {parcelStatuses.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
    </label>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`rounded-xl border p-4 text-sm font-bold ${
        tone === "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {children}
    </p>
  );
}
