"use client";

import { useCallback, useEffect, useState } from "react";

type Settings = {
  enabled: boolean;
  packaging_fee_paid: boolean;
  vat_fee_paid: boolean;
  seller_legal_name: string | null;
  vat_registration_number: string | null;
  vat_invoice_number: string | null;
  payment_deadline: string | null;
  payment_instructions: string | null;
  delivery_time_window: string | null;
};

type Log = {
  step_key: string;
  state: string;
  reason: string | null;
  scheduled_for: string;
  sent_at: string | null;
};

const emptySettings: Settings = {
  enabled: false,
  packaging_fee_paid: false,
  vat_fee_paid: false,
  seller_legal_name: null,
  vat_registration_number: null,
  vat_invoice_number: null,
  payment_deadline: null,
  payment_instructions: null,
  delivery_time_window: null,
};

const labels: Record<string, string> = {
  "shipment-created": "Shipment created",
  "packaging-charge": "£70 packaging and handling charge",
  "shipment-collected": "Shipment collected",
  "vat-invoice": "£199.80 VAT invoice",
  "payment-reminder": "Outstanding payment reminder",
  "local-depot": "Arrived at local depot",
  "delivery-today": "Delivery today",
};

export function ShipmentEmailAutomation({ shipmentId }: { shipmentId: string }) {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/shipments/${shipmentId}/automation`);
    const data = await response.json();
    if (response.ok) {
      setSettings(data.settings || emptySettings);
      setLogs(data.logs || []);
    }
  }, [shipmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/shipments/${shipmentId}/automation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Unable to save the automation settings.");
      return;
    }
    setSettings(data.settings);
    setMessage("Email sequence settings saved.");
    await load();
  }

  const field = (key: keyof Settings, value: string | boolean) =>
    setSettings((current) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">Three-day email automation</h3>
          <p className="mt-1 text-sm text-slate-600">Seven emails scheduled from creation through delivery, with payment and status safeguards.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <input checked={settings.enabled} onChange={(event) => field("enabled", event.target.checked)} type="checkbox" />
          Enabled
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <AutomationField label="Seller’s legal business name" value={settings.seller_legal_name || ""} onChange={(value) => field("seller_legal_name", value)} />
        <AutomationField label="VAT registration number" value={settings.vat_registration_number || ""} onChange={(value) => field("vat_registration_number", value)} />
        <AutomationField label="VAT invoice number" value={settings.vat_invoice_number || ""} onChange={(value) => field("vat_invoice_number", value)} />
        <AutomationField label="Payment deadline" type="datetime-local" value={toLocalInput(settings.payment_deadline)} onChange={(value) => field("payment_deadline", value ? new Date(value).toISOString() : "")} />
        <AutomationField label="Expected delivery time window" value={settings.delivery_time_window || ""} onChange={(value) => field("delivery_time_window", value)} />
      </div>

      <label className="mt-4 block text-sm font-bold text-slate-800">
        Official payment instructions
        <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" onChange={(event) => field("payment_instructions", event.target.value)} value={settings.payment_instructions || ""} />
      </label>

      <div className="mt-4 flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <input checked={settings.packaging_fee_paid} onChange={(event) => field("packaging_fee_paid", event.target.checked)} type="checkbox" />
          £70 charge paid
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <input checked={settings.vat_fee_paid} onChange={(event) => field("vat_fee_paid", event.target.checked)} type="checkbox" />
          £199.80 VAT paid
        </label>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button className="rounded-xl bg-[#0047bb] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50" disabled={busy} onClick={() => void save()} type="button">
          {busy ? "Saving…" : "Save automation"}
        </button>
        {message ? <p className="text-sm font-semibold text-slate-700">{message}</p> : null}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">Sequence activity</h4>
        <div className="mt-3 grid gap-2">
          {Object.entries(labels).map(([key, label]) => {
            const log = logs.find((item) => item.step_key === key);
            return (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm" key={key}>
                <span className="font-bold text-slate-900">{label}</span>
                <span className="text-slate-600" title={log?.reason || undefined}>{log ? log.state : "scheduled"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AutomationField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm font-bold text-slate-800">
      {label}
      <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
