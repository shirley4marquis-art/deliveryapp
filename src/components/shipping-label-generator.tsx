"use client";

import JsBarcode from "jsbarcode";
import {
  ArrowLeft,
  Barcode,
  Printer,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Shipment } from "@/lib/types";

type Carrier = "fedex" | "royal-mail";

type LabelForm = {
  carrier: Carrier;
  service: string;
  sender: string;
  recipient: string;
  tracking: string;
  itemNature: string;
  contents: string;
  description: string;
  weight: string;
  dimensions: string;
  declaredValue: string;
  signatureRequired: boolean;
  idVerification: boolean;
  fragile: boolean;
  doNotStack: boolean;
  thisSideUp: boolean;
  securitySeal: boolean;
  sealNumber: string;
};

export function ShippingLabelGenerator({
  shipmentId,
}: {
  shipmentId: string;
}) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [form, setForm] = useState<LabelForm | null>(null);
  const [error, setError] = useState("");
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [qrCode, setQrCode] = useState("");

  const loadShipment = useCallback(async () => {
    const response = await fetch(`/api/admin/shipments/${shipmentId}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to load shipment information.");
      return;
    }

    const nextShipment = data.shipment as Shipment;
    setShipment(nextShipment);
    setForm(createLabelForm(nextShipment));
  }, [shipmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadShipment(), 0);
    return () => window.clearTimeout(timer);
  }, [loadShipment]);

  useEffect(() => {
    if (!form?.tracking || !barcodeRef.current) return;
    JsBarcode(barcodeRef.current, form.tracking.replace(/\s/g, ""), {
      format: "CODE128",
      displayValue: false,
      height: 115,
      margin: 0,
      width: 3,
    });
  }, [form?.tracking, form?.carrier]);

  useEffect(() => {
    if (!form?.tracking) return;
    const trackingUrl = `${window.location.origin}/track?q=${encodeURIComponent(form.tracking)}`;
    void QRCode.toDataURL(trackingUrl, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 600,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrCode);
  }, [form?.tracking]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
        <Link className="font-bold text-[#0047bb]" href="/admin">
          ← Back to admin
        </Link>
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!shipment || !form) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="font-bold text-[#50627f]">Loading label generator…</p>
      </div>
    );
  }

  const setField = <K extends keyof LabelForm>(
    field: K,
    value: LabelForm[K],
  ) => setForm((current) => (current ? { ...current, [field]: value } : current));

  const routeCode = makeRouteCode(form.recipient);

  return (
    <>
      <main className="label-workspace mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <header className="no-print mb-6 flex flex-col gap-4 rounded-2xl bg-[#07152f] p-6 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-200 hover:text-white"
              href={`/admin/tracking/${shipment.id}`}
            >
              <ArrowLeft size={16} /> Back to tracking editor
            </Link>
            <h1 className="mt-3 text-3xl font-black">Shipping label generator</h1>
            <p className="mt-1 text-sm text-blue-100">
              {shipment.receiver_name} · {shipment.tracking_number}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fff1cc] px-5 py-3 font-black text-[#07152f] hover:bg-white"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={18} /> Print HD colour / save PDF
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <aside className="no-print self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-50 p-2.5 text-[#0047bb]">
                <Barcode size={21} />
              </span>
              <div>
                <h2 className="font-black text-[#07152f]">Label information</h2>
                <p className="text-xs text-[#50627f]">Edit before printing</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <SelectField
                label="Carrier template"
                onChange={(value) => {
                  const carrier = value as Carrier;
                  setForm({
                    ...form,
                    carrier,
                    service:
                      carrier === "fedex" ? "Express Saver" : "Tracked 24",
                  });
                }}
                options={[
                  ["fedex", "FedEx"],
                  ["royal-mail", "Royal Mail"],
                ]}
                value={form.carrier}
              />
              <SelectField
                label="Service"
                onChange={(value) => setField("service", value)}
                options={
                  form.carrier === "fedex"
                    ? [
                        ["Express Saver", "Express Saver"],
                        ["International Priority", "International Priority"],
                        ["International Economy", "International Economy"],
                      ]
                    : [
                        ["Tracked 24", "Tracked 24"],
                        ["Tracked 48", "Tracked 48"],
                        ["Special Delivery", "Special Delivery"],
                      ]
                }
                value={form.service}
              />
              <TextField
                label="Tracking number"
                onChange={(value) => setField("tracking", value.toUpperCase())}
                value={form.tracking}
              />
              {form.carrier === "fedex" ? (
                <TextAreaField
                  label="From (shipper)"
                  onChange={(value) => setField("sender", value)}
                  value={form.sender}
                />
              ) : null}
              <TextAreaField
                label="To (recipient)"
                onChange={(value) => setField("recipient", value)}
                value={form.recipient}
              />
              {form.carrier === "royal-mail" ? (
                <>
                  <SelectField
                    label="Nature of item"
                    onChange={(value) => setField("itemNature", value)}
                    options={[
                      ["General Parcel", "General parcel"],
                      ["Fragile", "Fragile"],
                      ["Electronics", "Electronics / device"],
                      ["Documents", "Documents"],
                      ["Clothing", "Clothing"],
                      ["Medical", "Medical item"],
                      ["Perishable", "Perishable"],
                      ["Handle with Care", "Handle with care"],
                    ]}
                    value={form.itemNature}
                  />
                  <TextField
                    label="Weight"
                    onChange={(value) => setField("weight", value)}
                    value={form.weight}
                  />
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Contents"
                    onChange={(value) => setField("contents", value)}
                    value={form.contents}
                  />
                  <TextField
                    label="Weight"
                    onChange={(value) => setField("weight", value)}
                    value={form.weight}
                  />
                </div>
              )}
            </div>
          </aside>

          <section className="preview-shell overflow-auto rounded-2xl border border-slate-200 bg-slate-200 p-4 shadow-inner md:p-8">
            <div
              className={`shipping-label mx-auto bg-white text-black ${
                form.carrier === "fedex" ? "fedex-label" : "royal-mail-label"
              }`}
            >
              {form.carrier === "fedex" ? (
                <FedExLabel
                  barcodeRef={barcodeRef}
                  form={form}
                  shipment={shipment}
                />
              ) : (
                <RoyalMailLabel
                  barcodeRef={barcodeRef}
                  form={form}
                  qrCode={qrCode}
                  routeCode={routeCode}
                />
              )}
            </div>
          </section>
        </div>
      </main>

      <style jsx global>{`
        .shipping-label {
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .fedex-label {
          min-height: 297mm;
          width: 210mm;
        }
        .fedex-label .address-label {
          font-size: 14px;
          letter-spacing: 0.08em;
        }
        .fedex-label .address-value {
          font-size: 23px;
          line-height: 1.4;
          margin-top: 12px;
        }
        .royal-mail-label {
          min-height: 297mm;
          width: 210mm;
        }
        .shipping-label * {
          box-sizing: border-box;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .shipping-label svg {
          shape-rendering: crispEdges;
        }
        .shipping-label img {
          image-rendering: pixelated;
        }
        @media print {
          @page fedex {
            margin: 0;
            size: A4 portrait;
          }
          @page royalmail {
            margin: 0;
            size: A4 portrait;
          }
          body {
            background: white !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          body > * {
            visibility: hidden;
          }
          .shipping-label,
          .shipping-label * {
            visibility: visible;
          }
          .shipping-label {
            background: white !important;
            left: 0;
            margin: 0;
            position: absolute;
            top: 0;
          }
          .fedex-label {
            min-height: 297mm;
            page: fedex;
            width: 210mm;
          }
          .royal-mail-label {
            min-height: 297mm;
            page: royalmail;
            width: 210mm;
          }
          .no-print,
          .preview-shell {
            border: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
}

function FedExLabel({
  barcodeRef,
  form,
  shipment,
}: {
  barcodeRef: React.RefObject<SVGSVGElement | null>;
  form: LabelForm;
  shipment: Shipment;
}) {
  return (
    <article className="min-h-[297mm] border-[3px] border-black p-8">
      <div className="flex items-start justify-between border-b-[3px] border-black pb-6">
        <span className="mt-3 h-14 w-32 bg-black" />
        <div className="text-center">
          <div className="text-[78px] font-black leading-none tracking-[-0.08em]">
            <span className="text-[#4d148c]">Fed</span>
            <span className="text-[#ff6600]">Ex</span>
          </div>
          <p className="mt-2 text-2xl font-black uppercase tracking-wide">
            {form.service}
          </p>
        </div>
        <span className="mt-3 h-14 w-32 bg-black" />
      </div>

      <div className="grid min-h-[72mm] grid-cols-2 border-b-[3px] border-black">
        <AddressBlock label="From (shipper)" value={form.sender} />
        <AddressBlock bordered label="To (recipient)" value={form.recipient} />
      </div>

      <div className="border-b-[3px] border-black py-10 text-center">
        <p className="text-2xl font-black">TRACKING NUMBER</p>
        <svg className="mx-auto mt-6 max-w-[90%]" ref={barcodeRef} />
        <p className="mt-5 font-mono text-4xl font-black tracking-[0.16em]">
          {form.tracking}
        </p>
      </div>

      <div className="grid min-h-[54mm] grid-cols-2 border-b-[3px] border-black text-xl">
        <div className="p-6">
          <p className="text-sm font-black uppercase tracking-widest">Service</p>
          <p className="mt-2 text-2xl font-black">{form.service}</p>
          <p className="mt-7 text-sm font-black uppercase tracking-widest">
            Estimated delivery
          </p>
          <p className="mt-2 text-2xl font-black">
            {formatLabelDate(shipment.estimated_delivery_date)}
          </p>
        </div>
        <div className="border-l-[3px] border-black p-6">
          <p className="text-sm font-black uppercase tracking-widest">Contents</p>
          <p className="mt-2 text-2xl font-black">{form.contents || "Parcel"}</p>
          <p className="mt-7 text-sm font-black uppercase tracking-widest">
            Total weight
          </p>
          <p className="mt-2 text-2xl font-black">{form.weight || "—"}</p>
        </div>
      </div>

      <p className="mt-6 text-center text-sm font-bold tracking-wide">
        CARRIER REFERENCE LABEL · AND PROOF OF POSTAGE OR PAYMENT
      </p>
    </article>
  );
}

function RoyalMailLabel({
  barcodeRef,
  form,
  qrCode,
  routeCode,
}: {
  barcodeRef: React.RefObject<SVGSVGElement | null>;
  form: LabelForm;
  qrCode: string;
  routeCode: string;
}) {
  const speed = form.service.match(/\d+/)?.[0] || "SD";
  const requiresSignature =
    form.signatureRequired || /special delivery/i.test(form.service);
  return (
    <article className="min-h-[297mm] border-[3px] border-black">
      <div className="grid grid-cols-[1fr_190px] border-b-[3px] border-black">
        <div className="p-7">
          <p className="text-[66px] font-black leading-none">
            {form.service.replace(/\s*\d+$/, "")}{" "}
            <span className="text-[96px]">{speed}</span>
          </p>
          <p className="mt-2 text-3xl leading-none">
            {requiresSignature ? "Signature Required" : "No Signature"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center border-l-[3px] border-black p-5">
          <p className="text-xl">Delivered by</p>
          <div className="mt-3 border-[3px] border-red-700 bg-[#e3202b] px-4 py-3 text-center text-2xl font-black text-yellow-300">
            Royal Mail
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_190px] border-b-[3px] border-black">
        <div className="flex text-5xl font-black">
          <span className="bg-yellow-300 px-8 py-5">{routeCode.slice(0, 3)}</span>
          <span className="bg-black px-8 py-5 text-white">{routeCode.slice(3)}</span>
        </div>
        <div className="p-4 text-center text-base">
          <p className="uppercase">Item type</p>
          <p className="mt-1 text-xl font-black">{form.itemNature}</p>
          <p className="mt-1 font-bold">{form.weight || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-[190px_1fr] gap-8 border-b-[3px] border-black p-7">
        <div>
          {qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Tracking QR code" className="h-[170px] w-[170px]" src={qrCode} />
          ) : (
            <div className="h-[170px] w-[170px] bg-slate-100" />
          )}
        </div>
        <div className="min-w-0 text-center">
          <svg className="mx-auto max-w-full" ref={barcodeRef} />
          <p className="mt-4 bg-yellow-300 px-2 py-1 font-mono text-2xl font-black">
            {form.tracking}
          </p>
        </div>
      </div>

      <div className="min-h-[105mm] border-b-[3px] border-black p-10">
        <p className="whitespace-pre-line text-4xl leading-[1.45]">{form.recipient}</p>
      </div>

      <div className="p-7 text-center">
        <p className="font-mono text-[48px] font-black tracking-wide">
          {form.tracking}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3 text-sm font-bold">
          <ShieldCheck size={19} />
          CARRIER REFERENCE LABEL AND PROOF OF POSTAGE
        </div>
      </div>
    </article>
  );
}

function AddressBlock({
  bordered = false,
  label,
  value,
}: {
  bordered?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className={`p-2 ${bordered ? "border-l-2 border-black" : ""}`}>
      <p className="address-label text-[10px] font-black uppercase">{label}</p>
      <p className="address-value mt-1 whitespace-pre-line text-[11px] leading-4">
        {value}
      </p>
    </div>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#1f3556]">{label}</span>
      <input
        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#0047bb]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#1f3556]">{label}</span>
      <textarea
        className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#0047bb]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[][];
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#1f3556]">{label}</span>
      <select
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0047bb]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function createLabelForm(shipment: Shipment): LabelForm {
  const carrier: Carrier = /royal mail|tracked|special delivery/i.test(
    shipment.delivery_service,
  )
    ? "royal-mail"
    : "fedex";
  return {
    carrier,
    service:
      shipment.delivery_service ||
      (carrier === "royal-mail" ? "Tracked 24" : "Express Saver"),
    sender: formatAddress(
      shipment.sender_name,
      shipment.sender_address,
      shipment.sender_city,
    ),
    recipient: formatAddress(
      shipment.receiver_name,
      shipment.receiver_address,
      shipment.receiver_city,
      shipment.receiver_postcode,
    ),
    tracking: shipment.tracking_number,
    itemNature: inferItemNature(shipment),
    contents: shipment.package_type || "Parcel",
    description: shipment.notes || shipment.package_type || "Shipment",
    weight: shipment.weight || "",
    dimensions: "",
    declaredValue: "",
    signatureRequired: false,
    idVerification: false,
    fragile: false,
    doNotStack: false,
    thisSideUp: true,
    securitySeal: false,
    sealNumber: "",
  };
}

function formatAddress(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("\n");
}

function formatLabelDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function makeRouteCode(value: string) {
  const clean = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `${clean.slice(-3).padStart(3, "R")}${clean.slice(0, 3).padEnd(3, "0")}`;
}

function inferItemNature(shipment: Shipment) {
  const details = `${shipment.package_type} ${shipment.notes || ""}`.toLowerCase();
  if (/phone|laptop|tablet|computer|electronic|device|battery/.test(details)) {
    return "Electronics";
  }
  if (/document|letter|paper|certificate/.test(details)) return "Documents";
  if (/cloth|shirt|dress|shoe|fashion|garment/.test(details)) return "Clothing";
  if (/medical|medicine|pharmacy/.test(details)) return "Medical";
  if (/food|fresh|perishable/.test(details)) return "Perishable";
  if (/fragile|glass|ceramic/.test(details)) return "Fragile";
  return "General Parcel";
}
