"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Save, Search, Trash2, PackagePlus } from "lucide-react";
import {
  AddressAutocomplete,
  type VerifiedAddress,
} from "@/components/address-autocomplete";
import { AdminRouteMap } from "@/components/admin-route-map";
import { parcelStatuses, type ParcelStatus, type Shipment } from "@/lib/types";

const deliveryServices = [
  "Same-day delivery",
  "Next-day delivery",
  "Standard delivery (2–3 days)",
  "Business courier",
  "Secure document delivery",
  "Express tracked delivery",
] as const;

function toDatetimeLocal(iso?: string) {
  if (!iso) return new Date().toISOString().slice(0, 16);
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

function emptyShipment() {
  return {
    tracking_number: "",
    sender_name: "",
    sender_address: "",
    sender_city: "",
    sender_place_id: "",
    receiver_name: "",
    receiver_email: "",
    receiver_address: "",
    receiver_city: "",
    receiver_postcode: "",
    receiver_place_id: "",
    package_type: "Parcel",
    weight: "",
    delivery_service: "Next-day delivery",
    current_status: "Shipment Created" as ParcelStatus,
    estimated_delivery_date: "",
    created_at: toDatetimeLocal(),
    notes: "",
    pickup_lat: "",
    pickup_lng: "",
    delivery_lat: "",
    delivery_lng: "",
    current_lat: "",
    current_lng: "",
  };
}

async function geocodeAddress(address: string) {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0] as {
      lat: string;
      lon: string;
      place_id: string;
      address: {
        city?: string; town?: string; village?: string;
        county?: string; state?: string; postcode?: string;
      };
    };
    const a = r.address;
    return {
      lat: r.lat,
      lng: r.lon,
      placeId: `osm:${r.place_id}`,
      city: a.city || a.town || a.village || a.county || a.state || "",
      postcode: a.postcode || "",
    };
  } catch {
    return null;
  }
}

type Toast = { message: string; type: "success" | "error" };

export function AdminDashboard() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [form, setForm] = useState(emptyShipment());
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }

  async function sendEmailForShipment(shipmentId: string) {
    const res = await fetch("/api/admin/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: shipmentId }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Email sent to receiver successfully.", "success");
    } else {
      showToast(`Email failed: ${data.error || "Unknown error"}`, "error");
    }
  }
  const [timeline, setTimeline] = useState({
    shipmentId: "",
    event_date: "",
    event_clock: "",
    location: "",
    status: "In Transit" as ParcelStatus,
    description: "",
    customs_charge_amount: "",
  });

  const filteredShipments = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return shipments;

    return shipments.filter((shipment) =>
      [
        shipment.tracking_number,
        shipment.sender_name,
        shipment.receiver_name,
        shipment.receiver_city,
        shipment.receiver_postcode,
        shipment.current_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, shipments]);

  const loadShipments = useCallback(async () => {
    const response = await fetch("/api/admin/shipments");
    const data = await response.json();
    setLoadingShipments(false);

    if (response.ok) {
      setShipments(data.shipments || []);
      return;
    }

    if (response.status === 401) {
      router.replace("/admin-login");
    } else {
      setError(data.error || "Unable to load shipments.");
    }
  }, [router]);

  useEffect(() => {
    void fetch("/api/admin/shipments").then(async (response) => {
      const data = await response.json();
      setLoadingShipments(false);

      if (response.ok) {
        setShipments(data.shipments || []);
        return;
      }

      if (response.status === 401) {
        router.replace("/admin-login");
      } else {
        setError(data.error || "Unable to load shipments.");
      }
    });
  }, [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin-login");
  }

  async function generateTrackingNumber() {
    setError("");
    const response = await fetch("/api/admin/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate-tracking-number" }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to generate tracking number.");
      return;
    }

    setForm((current) => ({
      ...current,
      tracking_number: data.trackingNumber,
    }));
  }

  async function saveShipment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // Geocode any address that still has no coordinates (handles both the
    // dropdown-selection path and the plain-type path).
    let payload = { ...form };

    if (!payload.pickup_lat && payload.sender_address) {
      const geo = await geocodeAddress(payload.sender_address);
      if (geo) {
        payload = {
          ...payload,
          pickup_lat: geo.lat,
          pickup_lng: geo.lng,
          sender_city: payload.sender_city || geo.city,
          sender_place_id: payload.sender_place_id || geo.placeId,
          current_lat: payload.current_lat || geo.lat,
          current_lng: payload.current_lng || geo.lng,
        };
      }
    }

    if (!payload.delivery_lat && payload.receiver_address) {
      const geo = await geocodeAddress(payload.receiver_address);
      if (geo) {
        payload = {
          ...payload,
          delivery_lat: geo.lat,
          delivery_lng: geo.lng,
          receiver_city: payload.receiver_city || geo.city,
          receiver_postcode: payload.receiver_postcode || geo.postcode,
          receiver_place_id: payload.receiver_place_id || geo.placeId,
        };
      }
    }

    // Convert the datetime-local string to a full ISO timestamp
    if (payload.created_at) {
      payload = {
        ...payload,
        created_at: new Date(payload.created_at).toISOString(),
      };
    }

    const response = await fetch(
      editingId ? `/api/admin/shipments/${editingId}` : "/api/admin/shipments",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Unable to save shipment.");
      return;
    }

    setMessage(editingId ? "Shipment updated." : "Shipment created.");
    const savedShipmentId: string = data.shipment?.id ?? editingId;
    setForm(emptyShipment());
    setEditingId("");
    await loadShipments();

    if (savedShipmentId) {
      await sendEmailForShipment(savedShipmentId);
    }
  }

  async function deleteShipment(id: string) {
    if (!window.confirm("Delete this shipment?")) return;

    const response = await fetch(`/api/admin/shipments/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to delete shipment.");
      return;
    }

    setMessage("Shipment deleted.");
    await loadShipments();
  }

  function editShipment(shipment: Shipment) {
    setEditingId(shipment.id);
    setForm({
      tracking_number: shipment.tracking_number,
      sender_name: shipment.sender_name,
      sender_address: shipment.sender_address,
      sender_city: shipment.sender_city,
      sender_place_id: shipment.sender_place_id || "",
      receiver_name: shipment.receiver_name,
      receiver_email: (shipment as unknown as Record<string, string>).receiver_email || "",
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
      pickup_lat: coordinateToInput(shipment.pickup_lat),
      pickup_lng: coordinateToInput(shipment.pickup_lng),
      delivery_lat: coordinateToInput(shipment.delivery_lat),
      delivery_lng: coordinateToInput(shipment.delivery_lng),
      current_lat: coordinateToInput(shipment.current_lat),
      current_lng: coordinateToInput(shipment.current_lng),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addTimelineEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!timeline.shipmentId) {
      setError("Choose a shipment before adding a timeline event.");
      return;
    }

    const response = await fetch(`/api/admin/shipments/${timeline.shipmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(timeline),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to add timeline event.");
      return;
    }

    setMessage("Timeline event added and status updated.");
    const shipmentIdForEmail = timeline.shipmentId;
    setTimeline({
      shipmentId: "",
      event_date: "",
      event_clock: "",
      location: "",
      status: "In Transit",
      description: "",
      customs_charge_amount: "",
    });
    await loadShipments();

    if (shipmentIdForEmail) {
      if (timeline.status === "Customs/Processing Check" && timeline.customs_charge_amount) {
        await sendCustomsEmailForShipment(shipmentIdForEmail, timeline.customs_charge_amount);
      } else {
        await sendEmailForShipment(shipmentIdForEmail);
      }
    }
  }

  async function sendCustomsEmailForShipment(shipmentId: string, chargeAmount: string) {
    const res = await fetch("/api/admin/send-customs-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: shipmentId, charge_amount: chargeAmount }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Customs charge email sent to receiver.", "success");
    } else {
      showToast(`Customs email failed: ${data.error || "Unknown error"}`, "error");
    }
  }

  const verifySenderAddress = useCallback((address: VerifiedAddress) => {
    setForm((current) => ({
      ...current,
      sender_address: address.address,
      sender_city: address.city,
      sender_place_id: address.placeId,
      pickup_lat: address.lat,
      pickup_lng: address.lng,
      current_lat: current.current_lat || address.lat,
      current_lng: current.current_lng || address.lng,
    }));
  }, []);

  const verifyReceiverAddress = useCallback((address: VerifiedAddress) => {
    setForm((current) => ({
      ...current,
      receiver_address: address.address,
      receiver_city: address.city,
      receiver_postcode: address.postcode.toUpperCase(),
      receiver_place_id: address.placeId,
      delivery_lat: address.lat,
      delivery_lng: address.lng,
    }));
  }, []);

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-3 rounded-lg border border-[#c8d9f5] bg-[#f3f7ff] p-5 text-[#07152f] md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">Admin Dashboard</h2>
          <p className="text-sm font-medium text-[#10213f]">
            Manage shipments, parcel statuses, and tracking timelines.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#0047bb] px-4 py-2 text-sm font-bold text-slate-100 hover:bg-[#0039a0] hover:text-white"
            onClick={() => {
              setEditingId("");
              setForm(emptyShipment());
              setError("");
              setMessage("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            type="button"
          >
            <PackagePlus size={16} />
            New Shipment
          </button>
          <button className="rounded-lg border border-[#0047bb] px-4 py-2 text-sm font-bold text-[#0047bb] hover:bg-white" onClick={logout} type="button">
            Sign out
          </button>
        </div>
      </div>

      {error ? <Alert tone="error" text={error} /> : null}
      {message ? <Alert tone="success" text={message} /> : null}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-bold text-white shadow-2xl ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={saveShipment}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-black">
              {editingId ? "Edit shipment" : "Create new shipment"}
            </h3>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold"
              onClick={generateTrackingNumber}
              type="button"
            >
              <RefreshCw size={16} /> Generate
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Tracking number" value={form.tracking_number} onChange={(value) => setForm({ ...form, tracking_number: value.toUpperCase() })} />
            <Field label="Shipment created date & time" type="datetime-local" value={form.created_at} onChange={(value) => setForm({ ...form, created_at: value })} />
            <Field label="Sender name" value={form.sender_name} onChange={(value) => setForm({ ...form, sender_name: value })} />
            <AddressAutocomplete
              label="Sender address"
              helperText="Start typing to get suggestions, or type any address manually."
              onChange={(value) => setForm({ ...form, sender_address: value })}
              onVerifiedAddress={verifySenderAddress}
              value={form.sender_address}
            />
            <Field label="Receiver name" value={form.receiver_name} onChange={(value) => setForm({ ...form, receiver_name: value })} />
            <Field label="Receiver email" type="email" value={form.receiver_email} onChange={(value) => setForm({ ...form, receiver_email: value })} required={false} />
            <AddressAutocomplete
              label="Receiver address"
              helperText="Start typing to get suggestions, or type any address manually."
              onChange={(value) => setForm({ ...form, receiver_address: value })}
              onVerifiedAddress={verifyReceiverAddress}
              value={form.receiver_address}
            />
            <Field label="Package type" value={form.package_type} onChange={(value) => setForm({ ...form, package_type: value })} />
            <Field label="Weight" value={form.weight} onChange={(value) => setForm({ ...form, weight: value })} />
            <DeliveryServiceSelect value={form.delivery_service} onChange={(value) => setForm({ ...form, delivery_service: value })} />
            <Field label="Estimated delivery date" type="date" value={form.estimated_delivery_date} onChange={(value) => setForm({ ...form, estimated_delivery_date: value })} />
            <StatusSelect value={form.current_status} onChange={(value) => setForm({ ...form, current_status: value })} />
            <Field label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} required={false} />
          </div>
          <div className="mt-6 rounded-lg border border-[#c8d9f5] bg-[#f7faff] p-4">
            <h4 className="text-lg font-black text-[#07152f]">Delivery route map</h4>
            <p className="mt-1 text-sm font-medium text-[#10213f]">
              Route is drawn automatically from the sender and receiver addresses.
              Drag the amber marker to update the current parcel location.
            </p>
            <div className="mt-4">
              <AdminRouteMap
                pickupLat={form.pickup_lat}
                pickupLng={form.pickup_lng}
                deliveryLat={form.delivery_lat}
                deliveryLng={form.delivery_lng}
                currentLat={form.current_lat}
                currentLng={form.current_lng}
                onCurrentLocationChange={(lat, lng) =>
                  setForm((f) => ({ ...f, current_lat: lat, current_lng: lng }))
                }
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#0047bb] px-5 py-3 text-sm font-bold text-white" disabled={loading}>
              <Save size={16} /> {loading ? "Saving..." : "Save shipment"}
            </button>
            {editingId ? (
              <button
                className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyShipment());
                }}
                type="button"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={addTimelineEvent}>
          <h3 className="text-xl font-black">Add timeline event</h3>
          <label className="mt-5 block">
            <span className="text-sm font-bold text-[#10213f]">Shipment</span>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#0047bb]"
              onChange={(event) => setTimeline({ ...timeline, shipmentId: event.target.value })}
              required
              value={timeline.shipmentId}
            >
              <option value="">Choose shipment</option>
              {shipments.map((shipment) => (
                <option key={shipment.id} value={shipment.id}>
                  {shipment.tracking_number} - {shipment.receiver_city}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Date" type="date" value={timeline.event_date} onChange={(value) => setTimeline({ ...timeline, event_date: value })} />
            <Field label="Time" type="time" value={timeline.event_clock} onChange={(value) => setTimeline({ ...timeline, event_clock: value })} />
          </div>
          <Field label="Location" value={timeline.location} onChange={(value) => setTimeline({ ...timeline, location: value })} />
          <StatusSelect value={timeline.status} onChange={(value) => setTimeline({ ...timeline, status: value })} />
          <Field label="Description" value={timeline.description} onChange={(value) => setTimeline({ ...timeline, description: value })} required={false} />

          {timeline.status === "Customs/Processing Check" && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">Customs charge email will be sent automatically</p>
              <p className="mt-1 text-xs text-amber-700">Enter the import VAT amount to include in the email to the receiver.</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-bold text-amber-800">£</span>
                <input
                  className="h-10 w-40 rounded-lg border border-amber-300 bg-white px-3 text-sm font-bold outline-none focus:border-amber-500"
                  inputMode="decimal"
                  onChange={(e) => setTimeline({ ...timeline, customs_charge_amount: e.target.value })}
                  placeholder="150.00"
                  type="text"
                  value={timeline.customs_charge_amount}
                />
              </div>
            </div>
          )}

          <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#ef3340] px-5 py-3 text-sm font-bold text-white">
            <Plus size={16} /> Add event
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-black">All shipments</h3>
          <label className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-300 px-3 md:w-80">
            <Search size={16} />
            <input
              className="min-w-0 flex-1 outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shipments"
              value={query}
            />
          </label>
        </div>
        <div className="mt-5 grid gap-3">
          {loadingShipments ? (
            <div className="flex items-center gap-3 rounded-lg bg-[#f7faff] p-5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c8d9f5] border-t-[#0047bb]" />
              <p className="text-sm font-semibold text-[#1f3556]">Loading shipments…</p>
            </div>
          ) : null}
          {!loadingShipments && filteredShipments.map((shipment) => (
            <article className="rounded-lg border border-slate-200 p-4" key={shipment.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="font-mono text-sm font-bold text-[#0047bb]">{shipment.tracking_number}</p>
                  <h4 className="mt-1 font-black">{shipment.receiver_name}</h4>
                  <p className="text-sm text-[#1f3556]">
                    {shipment.sender_city} to {shipment.receiver_city}, {shipment.receiver_postcode}
                  </p>
                </div>
                <div>
                  <p className="font-bold">{shipment.current_status}</p>
                  <p className="text-sm text-[#1f3556]">
                    ETA {shipment.estimated_delivery_date} | {shipment.delivery_service}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold" onClick={() => editShipment(shipment)} type="button">
                    Edit
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-[#0047bb] px-3 py-2 text-sm font-bold text-[#0047bb]"
                    onClick={() => sendEmailForShipment(shipment.id)}
                    title="Send status email to receiver"
                    type="button"
                  >
                    ✉ Email
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700" onClick={() => deleteShipment(shipment.id)} type="button">
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!loadingShipments && !filteredShipments.length ? (
            <p className="rounded-lg bg-[#f7faff] p-4 text-sm text-[#1f3556]">
              No shipments found.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  step,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-sm font-bold text-[#10213f]">{label}</span>
      <input
        className={`mt-2 h-11 w-full rounded-lg border border-slate-300 px-4 outline-none focus:border-[#0047bb] ${
          readOnly ? "bg-[#f7faff] text-[#50627f]" : ""
        }`}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

function coordinateToInput(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function StatusSelect({
  value,
  onChange,
}: {
  value: ParcelStatus;
  onChange: (value: ParcelStatus) => void;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-sm font-bold text-[#10213f]">Current status</span>
      <select
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#0047bb]"
        onChange={(event) => onChange(event.target.value as ParcelStatus)}
        value={value}
      >
        {parcelStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  );
}

function DeliveryServiceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-sm font-bold text-[#10213f]">Delivery service</span>
      <select
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#0047bb]"
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        <option value="">Select delivery service</option>
        {deliveryServices.map((service) => (
          <option key={service} value={service}>
            {service}
          </option>
        ))}
      </select>
    </label>
  );
}

function Alert({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <p
      className={`rounded-lg border p-4 text-sm font-bold ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700"
      }`}
    >
      {text}
    </p>
  );
}
