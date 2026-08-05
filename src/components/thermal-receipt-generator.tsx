"use client";

import { ArrowLeft, Plus, Printer, ReceiptText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { parsePastedOrder } from "@/lib/order-import";

type ReceiptItem = { id: number; name: string; quantity: number; unitPrice: number };
type ReceiptForm = {
  merchant: string;
  merchantDetails: string;
  receiptNumber: string;
  dateTime: string;
  customer: string;
  customerEmail: string;
  paymentMethod: string;
  currency: string;
  vatRate: number;
  declaredTotal: number | null;
  items: ReceiptItem[];
};

const moneyPattern = /(?:£|GBP\s*)\s*([\d,]+(?:\.\d{1,2})?)/i;

export function ThermalReceiptGenerator() {
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [receiptMode, setReceiptMode] = useState<"auto" | "custom">("auto");
  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);
  const [form, setForm] = useState<ReceiptForm>(emptyReceipt());

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [form.items],
  );
  const calculatedVat = subtotal * (form.vatRate / 100);
  const calculatedTotal = subtotal + calculatedVat;
  const total = form.declaredTotal ?? calculatedTotal;
  const vat = form.declaredTotal !== null
    ? total - total / (1 + form.vatRate / 100)
    : calculatedVat;
  const net = total - vat;
  const isAppleReceipt = receiptMode === "auto" && isApplePurchase(source, form.items);

  function importInvoice() {
    const imported = parsePastedOrder(source);
    const parsedItems = parseReceiptItems(source);
    const declaredTotal = parseMoney(imported.total);
    const applePurchase = isApplePurchase(source, parsedItems);
    const importedItems = parsedItems.length
      ? parsedItems
      : imported.items.map((name, index) => ({
          id: Date.now() + index,
          name: name.replace(/\s*[×x]\s*\d+$/i, ""),
          quantity: Number(name.match(/[×x]\s*(\d+)$/i)?.[1] || 1),
          unitPrice: 0,
        }));
    const receiptItems = applePurchase
      ? importedItems.map((item) => ({
          ...item,
          unitPrice: appleProductBasePrice(item.name) ?? item.unitPrice,
        }))
      : importedItems;
    setForm((current) => ({
      ...current,
      merchant: applePurchase
        ? "Apple Store Regent Street"
        : imported.source === "Unclassified" ? current.merchant : imported.source,
      merchantDetails: applePurchase
        ? "235 Regent Street\nLondon, W1B 2EL\nUnited Kingdom\n020 7153 9000"
        : current.merchantDetails,
      receiptNumber: imported.orderReference || current.receiptNumber,
      customer: imported.customerName,
      customerEmail: imported.customerEmail,
      vatRate: applePurchase ? 20 : current.vatRate,
      declaredTotal: applePurchase ? null : declaredTotal,
      items: receiptItems,
    }));
    setMessage(
      applePurchase
        ? "VAT-inclusive Apple prices applied. The 20% VAT portion has been separated automatically."
        : parsedItems.some((item) => item.unitPrice > 0)
          ? "Invoice imported. Check the values before printing."
          : "Order imported. Add the product price shown on the invoice before printing.",
    );
  }

  function updateItem(id: number, patch: Partial<ReceiptItem>) {
    setForm((current) => ({
      ...current,
      declaredTotal: null,
      items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  return (
    <main className="receipt-workspace mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <header className="no-print mb-6 flex flex-col gap-4 rounded-2xl bg-[#07152f] p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-200 hover:text-white" href="/admin">
            <ArrowLeft size={16} /> Back to admin
          </Link>
          <h1 className="mt-3 text-3xl font-black">Thermal receipt builder</h1>
          <p className="mt-1 text-sm text-blue-100">Copy purchase details into an editable receipt, then print at the exact roll width.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fff1cc] px-5 py-3 font-black text-[#07152f]" onClick={() => window.print()} type="button">
          <Printer size={18} /> Print {paperWidth} mm receipt
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="no-print space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-[#07152f]">Paste purchase invoice</h2>
            <textarea className="mt-3 min-h-52 w-full rounded-xl border border-slate-300 p-4 text-sm outline-none focus:border-[#0047bb]" onChange={(event) => setSource(event.target.value)} placeholder="Paste the complete Ruco purchase invoice here…" value={source} />
            <button className="mt-3 rounded-lg bg-[#0047bb] px-5 py-2.5 text-sm font-black text-white disabled:opacity-40" disabled={!source.trim()} onClick={importInvoice} type="button">Import receipt details</button>
            {message ? <p className="mt-3 text-sm font-bold text-amber-800">{message}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-[#07152f]">Receipt information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-black text-[#1f3556]">Template mode
                <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" onChange={(event) => setReceiptMode(event.target.value as "auto" | "custom")} value={receiptMode}>
                  <option value="auto">Auto-detect Apple</option>
                  <option value="custom">Custom merchant receipt</option>
                </select>
              </label>
              <label className="block text-xs font-black text-[#1f3556]">Printer roll size
                <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" onChange={(event) => setPaperWidth(Number(event.target.value) as 58 | 80)} value={paperWidth}>
                  <option value={80}>80 mm receipt printer</option>
                  <option value={58}>58 mm receipt printer</option>
                </select>
              </label>
              <Field label="Merchant" value={form.merchant} onChange={(merchant) => setForm({ ...form, merchant })} />
              <Field label="Receipt / order number" value={form.receiptNumber} onChange={(receiptNumber) => setForm({ ...form, receiptNumber })} />
              <Field label="Customer" value={form.customer} onChange={(customer) => setForm({ ...form, customer })} />
              <Field label="Customer email" value={form.customerEmail} onChange={(customerEmail) => setForm({ ...form, customerEmail })} />
              <Field label="Date and time" type="datetime-local" value={form.dateTime} onChange={(dateTime) => setForm({ ...form, dateTime })} />
              <Field label="Payment method" value={form.paymentMethod} onChange={(paymentMethod) => setForm({ ...form, paymentMethod })} />
              <Field label="VAT rate (%)" type="number" value={String(form.vatRate)} onChange={(value) => setForm({ ...form, vatRate: Number(value) || 0 })} />
              <Field label="Invoice total (£, optional override)" type="number" value={form.declaredTotal?.toString() || ""} onChange={(value) => setForm({ ...form, declaredTotal: value ? Number(value) : null })} />
            </div>
            <label className="mt-4 block text-sm font-bold text-[#10213f]">Merchant address / VAT details
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 p-3 font-normal" onChange={(event) => setForm({ ...form, merchantDetails: event.target.value })} value={form.merchantDetails} />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-[#07152f]">Purchased items</h2>
              <button className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-2 text-sm font-black text-[#0047bb]" onClick={() => setForm({ ...form, declaredTotal: null, items: [...form.items, { id: Date.now(), name: "", quantity: 1, unitPrice: 0 }] })} type="button"><Plus size={15} /> Add item</button>
            </div>
            <div className="mt-4 space-y-3">
              {form.items.map((item) => (
                <div className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_90px_120px_40px]" key={item.id}>
                  <Field label="Product" value={item.name} onChange={(name) => updateItem(item.id, { name })} />
                  <Field label="Qty" type="number" value={String(item.quantity)} onChange={(value) => updateItem(item.id, { quantity: Math.max(1, Number(value) || 1) })} />
                  <Field label="Unit price (£)" type="number" value={String(item.unitPrice)} onChange={(value) => updateItem(item.id, { unitPrice: Number(value) || 0 })} />
                  <button aria-label="Remove item" className="mt-6 text-red-600" onClick={() => setForm({ ...form, declaredTotal: null, items: form.items.filter((candidate) => candidate.id !== item.id) })} type="button"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="preview-shell self-start overflow-auto rounded-2xl bg-slate-300 p-5 xl:sticky xl:top-5">
          {isAppleReceipt ? (
            <AppleReceipt form={form} net={net} paperWidth={paperWidth} total={total} vat={vat} />
          ) : (
          <article className="thermal-receipt mx-auto bg-white px-[4mm] py-[5mm] font-mono text-black" style={{ width: `${paperWidth}mm` }}>
            <div className="text-center">
              <ReceiptText className="mx-auto" size={30} strokeWidth={2.5} />
              <h2 className="mt-2 text-[18px] font-black uppercase">{form.merchant || "Merchant"}</h2>
              <p className="mt-1 whitespace-pre-line text-[10px] leading-[1.35]">{form.merchantDetails}</p>
              <p className="mt-3 text-[11px] font-black">PURCHASE RECEIPT</p>
            </div>
            <Rule />
            <ReceiptRow label="Receipt" value={form.receiptNumber || "—"} />
            <ReceiptRow label="Date" value={formatDate(form.dateTime)} />
            <ReceiptRow label="Customer" value={form.customer || "—"} />
            {form.customerEmail ? <p className="break-all text-[9px]">{form.customerEmail}</p> : null}
            <Rule />
            <div className="grid grid-cols-[1fr_26px_64px] gap-1 text-[10px] font-black"><span>ITEM</span><span className="text-right">QTY</span><span className="text-right">AMOUNT</span></div>
            <div className="mt-2 space-y-2">
              {form.items.length ? form.items.map((item) => (
                <div key={item.id}>
                  <div className="grid grid-cols-[1fr_26px_64px] gap-1 text-[10px]"><span className="break-words font-bold">{item.name || "Item"}</span><span className="text-right">{item.quantity}</span><span className="text-right">{money(item.quantity * item.unitPrice)}</span></div>
                  <p className="text-[9px]">@ {money(item.unitPrice)} each</p>
                </div>
              )) : <p className="py-3 text-center text-[10px]">No items imported</p>}
            </div>
            <Rule />
            <ReceiptRow label="Net" value={money(net)} />
            <ReceiptRow label={`VAT (${form.vatRate}%)`} value={money(vat)} />
            <div className="mt-2 flex justify-between text-[15px] font-black"><span>TOTAL</span><span>{money(total)}</span></div>
            {form.declaredTotal !== null && Math.abs(calculatedTotal - total) > 0.01 ? <p className="mt-1 text-[8px]">Total taken from the pasted invoice.</p> : null}
            <Rule />
            <ReceiptRow label="Payment" value={form.paymentMethod || "—"} />
            <p className="mt-5 text-center text-[10px] font-bold">Thank you for your purchase</p>
            <p className="mt-2 text-center text-[8px]">Merchant-issued receipt • Keep for your records</p>
          </article>
          )}
        </section>
      </div>

      <style jsx global>{`
        .thermal-receipt { box-sizing: border-box; min-height: 120mm; print-color-adjust: exact; }
        .thermal-receipt * { box-sizing: border-box; }
        @media print {
          @page { margin: 0; size: ${paperWidth}mm auto; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; width: ${paperWidth}mm !important; }
          body > * { visibility: hidden; }
          .thermal-receipt, .thermal-receipt * { visibility: visible; }
          .thermal-receipt { left: 0; margin: 0; min-height: 0; position: absolute; top: 0; width: ${paperWidth}mm !important; }
          .no-print, .preview-shell { border: 0 !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </main>
  );
}

function AppleReceipt({ form, net, paperWidth, total, vat }: { form: ReceiptForm; net: number; paperWidth: 58 | 80; total: number; vat: number }) {
  const transaction = form.receiptNumber || "—";
  const digits = transaction.replace(/\D/g, "");
  const authCode = digits.slice(-6).padStart(6, "0");
  const account = digits.slice(-4).padStart(4, "0");

  return (
    <article className="thermal-receipt apple-receipt mx-auto bg-white px-[5mm] py-[6mm] font-mono text-black" style={{ width: `${paperWidth}mm` }}>
      <div className="text-center">
        <AppleMark />
        <p className="mt-5 text-[12px] font-bold leading-[1.35]">
          Apple Store<br />Regent Street<br />235 Regent Street<br />
          London, W1B 2EL<br />United Kingdom<br />020 7153 9000
        </p>
      </div>

      <div className="mt-1 flex justify-between text-[11px]"><span>Specialist</span><span>Apple London</span></div>
      <p className="text-center text-[11px]">{formatAppleDate(form.dateTime)}</p>

      <div className="mt-5">
        <ReceiptRow label="Transaction #" value={transaction} />
        {form.items.length ? form.items.map((item) => (
          <div className="mt-1 flex justify-between gap-2 text-[11px]" key={item.id}>
            <span className="min-w-0 break-words">{item.quantity} {item.name || "Apple product"}</span>
            <span className="shrink-0">{money(item.quantity * item.unitPrice * (1 + form.vatRate / 100))}</span>
          </div>
        )) : <p className="text-[11px]">1 Apple product</p>}
      </div>

      <div className="mt-2">
        <ReceiptRow label="Subtotal" value={money(net)} />
        <ReceiptRow label={`VAT (${form.vatRate}%)`} value={money(vat)} />
        <ReceiptRow label="Total" value={money(total)} />
        <ReceiptRow label="Card Type" value={form.paymentMethod || "Visa Credit"} />
      </div>

      <p className="mt-1 text-center text-[11px]">Thank you for your purchase!</p>
      <ReceiptRow label="Auth Code" value={authCode} />
      <div className="flex justify-between gap-3 text-[11px]"><span>Account</span><span className="text-right">**** **** ****<br />{account}</span></div>
      <ReceiptRow label="Amount Charged" value={money(total)} />

      <p className="mt-5 text-center text-[11px] leading-[1.4]">
        Exchange/Return Policy: 14 days<br />with valid receipt<br />www.apple.com
      </p>
      {form.customerEmail ? <p className="mt-4 break-all text-[10px]">E-mail: {form.customerEmail}</p> : null}
      <p className="mt-1 overflow-hidden whitespace-nowrap text-[10px]">********************************</p>
      <p className="text-center text-[11px]">Made with Thermer</p>
    </article>
  );
}

function AppleMark() {
  return (
    <svg aria-label="Apple" className="mx-auto h-[47mm] w-[47mm]" viewBox="0 0 200 240" role="img">
      <path d="M132 37c13-15 11-31 11-37-13 1-29 9-38 20-9 10-14 23-12 36 15 1 29-6 39-19ZM167 122c0-26 21-39 22-40-12-18-32-20-39-20-17-2-33 10-41 10-9 0-22-10-36-9-19 0-37 11-47 28-21 36-5 88 15 117 10 14 21 30 36 29 14 0 20-9 38-9 17 0 23 9 38 9 16 0 26-14 35-28 12-17 17-34 18-35-1 0-39-15-39-52Z" fill="currentColor" />
    </svg>
  );
}

function emptyReceipt(): ReceiptForm {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  return { merchant: "Ruco Supply", merchantDetails: "Online purchase\nUnited Kingdom", receiptNumber: "", dateTime: local, customer: "", customerEmail: "", paymentMethod: "Card", currency: "GBP", vatRate: 20, declaredTotal: null, items: [] };
}

function parseReceiptItems(text: string): ReceiptItem[] {
  const blocks = text.split(/(?=^\s*(?:\d+\.\s*)?Product\s*:)/gim).slice(1);
  return blocks.map((block, index) => {
    const name = block.match(/^\s*(?:\d+\.\s*)?Product\s*:\s*([^\r\n]+)/im)?.[1]?.trim() || `Item ${index + 1}`;
    const variant = block.match(/^\s*Variant(?:\/Colour)?\s*:\s*([^\r\n]+)/im)?.[1]?.trim();
    const quantity = Number(block.match(/^\s*Quantity\s*:\s*(\d+)/im)?.[1] || 1);
    const priceText = block.match(/^\s*(?:Unit price|Price|Item price)\s*:\s*([^\r\n]+)/im)?.[1] || "";
    return { id: Date.now() + index, name: variant ? `${name} — ${variant}` : name, quantity, unitPrice: parseMoney(priceText) || 0 };
  });
}

function isApplePurchase(source: string, items: ReceiptItem[]) {
  const productNames = items.map((item) => item.name).join(" ");
  return /\b(?:apple|iphone|ipad|macbook|imac|airpods|apple\s*watch|vision\s*pro|homepod)\b/i.test(`${source} ${productNames}`);
}

function appleProductBasePrice(name: string) {
  const vatDivisor = 1.2;
  if (/\bairpods?\s+max\b/i.test(name)) return 499 / vatDivisor;
  if (/\bairpods?\b/i.test(name)) return 165 / vatDivisor;
  if (/\b(?:iphone|apple\s+phone|phone)\b/i.test(name)) return 1199 / vatDivisor;
  return null;
}

function parseMoney(value: string) { const match = value.match(moneyPattern); return match ? Number(match[1].replace(/,/g, "")) : null; }
function money(value: number) { return `£${value.toFixed(2)}`; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function formatAppleDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(",", ""); }
function Rule() { return <div className="my-3 border-t border-dashed border-black" />; }
function ReceiptRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3 text-[10px]"><span>{label}</span><span className="text-right font-bold">{value}</span></div>; }
function Field({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) { return <label className="block text-xs font-black text-[#1f3556]">{label}<input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#0047bb]" min={type === "number" ? "0" : undefined} onChange={(event) => onChange(event.target.value)} step={type === "number" ? "0.01" : undefined} type={type} value={value} /></label>; }
