import { sendCustomEmail } from "@/lib/email";
import { getSupabaseServiceRole } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
type Settings = Database["public"]["Tables"]["shipment_email_automation"]["Row"];
type StepState = Database["public"]["Tables"]["shipment_automation_email_logs"]["Row"]["state"];

type SequenceStep = {
  key: string;
  hours: number;
  minimumStatuses?: string[];
  financial?: "packaging" | "vat" | "reminder";
  draft: (shipment: Shipment, settings: Settings) => { subject: string; message: string };
};

const sequence: SequenceStep[] = [
  {
    key: "shipment-created",
    hours: 0,
    draft: (shipment) => ({
      subject: `Your shipment has been created | Ref: ${shipment.tracking_number}`,
      message: `Dear ${shipment.receiver_name},\n\nYour shipment has been registered with Royal Runs Delivery and is now being prepared for collection.\n\nTracking reference: ${shipment.tracking_number}\nDelivery address: ${deliveryAddress(shipment)}\nEstimated delivery date: ${formatDate(shipment.estimated_delivery_date)}\n\nYou can use the tracking button in this email to follow the shipment’s progress.\n\nKind regards,\nRoyal Runs Delivery`,
    }),
  },
  {
    key: "packaging-charge",
    hours: 12,
    financial: "packaging",
    draft: (shipment, settings) => ({
      subject: `Packaging and handling charge — £70.00 | Ref: ${shipment.tracking_number}`,
      message: `Dear ${shipment.receiver_name},\n\nA packaging and handling charge of £70.00 has been raised for shipment ${shipment.tracking_number}.\n\nThis charge covers the documented packaging, handling, preparation, and any agreed discreet-packaging service required before dispatch.\n\nAmount due: £70.00\nPayment deadline: ${formatDateTime(settings.payment_deadline)}\nPayment instructions: ${settings.payment_instructions}\n\nPlease quote tracking reference ${shipment.tracking_number} when making payment. Processing will continue after payment is confirmed.\n\nKind regards,\nRoyal Runs Delivery\nAccounts Team`,
    }),
  },
  {
    key: "shipment-collected",
    hours: 24,
    minimumStatuses: ["Parcel Collected", "Arrived at Sorting Facility", "In Transit", "At Local Depot", "Out for Delivery"],
    draft: (shipment) => ({
      subject: `Your shipment has been collected | Ref: ${shipment.tracking_number}`,
      message: `Dear ${shipment.receiver_name},\n\nShipment ${shipment.tracking_number} has been collected and is moving through our domestic delivery network.\n\nCurrent status: Parcel collected\nEstimated delivery date: ${formatDate(shipment.estimated_delivery_date)}\n\nWe will continue monitoring the shipment and update its tracking information as it reaches each delivery stage.\n\nKind regards,\nRoyal Runs Delivery`,
    }),
  },
  {
    key: "vat-invoice",
    hours: 36,
    financial: "vat",
    draft: (shipment, settings) => ({
      subject: `VAT invoice issued — £199.80 | Ref: ${shipment.tracking_number}`,
      message: `Dear ${shipment.receiver_name},\n\nA VAT invoice has been issued in connection with the documented taxable sale associated with shipment ${shipment.tracking_number}.\n\nNet taxable value: £999.00\nVAT rate: 20%\nVAT amount: £199.80\nGross value: £1,198.80\n\nSeller: ${settings.seller_legal_name}\nVAT registration number: ${settings.vat_registration_number}\nInvoice number: ${settings.vat_invoice_number}\nInvoice date: ${formatDate(new Date().toISOString())}\nPayment deadline: ${formatDateTime(settings.payment_deadline)}\n\nPayment instructions: ${settings.payment_instructions}\n\nPlease verify the seller, invoice, and VAT-registration details before making payment. Quote the invoice number and shipment reference with your payment.\n\nKind regards,\n${settings.seller_legal_name}\nAccounts Department`,
    }),
  },
  {
    key: "payment-reminder",
    hours: 48,
    financial: "reminder",
    draft: (shipment, settings) => {
      const outstanding = [
        !settings.packaging_fee_paid ? "Packaging and handling charge — £70.00" : null,
        !settings.vat_fee_paid ? "VAT invoice — £199.80" : null,
      ].filter(Boolean);
      const amount = (settings.packaging_fee_paid ? 0 : 70) + (settings.vat_fee_paid ? 0 : 199.8);
      return {
        subject: `Payment reminder for your shipment | Ref: ${shipment.tracking_number}`,
        message: `Dear ${shipment.receiver_name},\n\nOur records indicate that the following documented charge remains outstanding for shipment ${shipment.tracking_number}:\n\nOutstanding invoice: ${outstanding.join("; ")}\nAmount due: £${amount.toFixed(2)}\nInvoice number: ${settings.vat_invoice_number || shipment.tracking_number}\nPayment deadline: ${formatDateTime(settings.payment_deadline)}\n\nIf payment has already been completed, please disregard this reminder while it is being reconciled. Otherwise, use the official payment instructions shown on the original invoice.\n\nKind regards,\nRoyal Runs Delivery\nAccounts Team`,
      };
    },
  },
  {
    key: "local-depot",
    hours: 60,
    minimumStatuses: ["At Local Depot", "Out for Delivery"],
    draft: (shipment, settings) => ({
      subject: `Your parcel has reached the local depot | Ref: ${shipment.tracking_number}`,
      message: `Dear ${shipment.receiver_name},\n\nShipment ${shipment.tracking_number} has reached the local depot responsible for completing delivery.\n\nDelivery address: ${deliveryAddress(shipment)}\nExpected delivery date: ${formatDate(shipment.estimated_delivery_date)}\nExpected time window: ${settings.delivery_time_window}\n\nPlease ensure the address is accessible and that someone is available if a signature or handover is required.\n\nKind regards,\nRoyal Runs Delivery`,
    }),
  },
  {
    key: "delivery-today",
    hours: 72,
    minimumStatuses: ["Out for Delivery"],
    draft: (shipment, settings) => ({
      subject: `Your parcel is due for delivery today | Ref: ${shipment.tracking_number}`,
      message: `Dear ${shipment.receiver_name},\n\nShipment ${shipment.tracking_number} is scheduled for delivery today.\n\nDelivery address: ${deliveryAddress(shipment)}\nExpected time window: ${settings.delivery_time_window}\n\nPlease ensure someone is available to receive the parcel. You can use the tracking button in this email to view the latest delivery information.\n\nKind regards,\nRoyal Runs Delivery`,
    }),
  },
];

export async function createDefaultEmailAutomation(shipmentId: string, createdAt?: string) {
  const supabase = getSupabaseServiceRole();
  return supabase.from("shipment_email_automation").upsert({
    shipment_id: shipmentId,
    enabled: true,
    seller_legal_name: process.env.VAT_SELLER_LEGAL_NAME || null,
    vat_registration_number: process.env.VAT_REGISTRATION_NUMBER || null,
    vat_invoice_number: `VAT-${shipmentId.slice(0, 8).toUpperCase()}`,
    payment_deadline: new Date(new Date(createdAt || Date.now()).getTime() + 48 * 60 * 60 * 1000).toISOString(),
    payment_instructions: process.env.AUTOMATION_PAYMENT_INSTRUCTIONS || null,
  });
}

export async function processEmailAutomations(shipmentId?: string) {
  const supabase = getSupabaseServiceRole();
  let settingsQuery = supabase.from("shipment_email_automation").select("*").eq("enabled", true);
  if (shipmentId) settingsQuery = settingsQuery.eq("shipment_id", shipmentId);
  const { data: settingsRows, error: settingsError } = await settingsQuery;
  if (settingsError) throw new Error(settingsError.message);
  if (!settingsRows?.length) return { checked: 0, sent: 0 };

  const { data: shipments, error: shipmentError } = await supabase
    .from("shipments")
    .select("*")
    .in("id", settingsRows.map((item) => item.shipment_id));
  if (shipmentError) throw new Error(shipmentError.message);

  let sent = 0;
  for (const settings of settingsRows) {
    const shipment = shipments?.find((item) => item.id === settings.shipment_id);
    if (!shipment || !shipment.receiver_email || shipment.current_status === "Delivered") continue;
    sent += await processShipment(shipment, settings);
  }
  return { checked: settingsRows.length, sent };
}

async function processShipment(shipment: Shipment, settings: Settings) {
  const receiverEmail = shipment.receiver_email;
  if (!receiverEmail) return 0;
  const supabase = getSupabaseServiceRole();
  const { data: logs } = await supabase
    .from("shipment_automation_email_logs")
    .select("step_key,state")
    .eq("shipment_id", shipment.id);
  const existing = new Map((logs || []).map((log) => [log.step_key, log.state]));
  let sent = 0;

  for (const step of sequence) {
    if (existing.get(step.key) === "sent" || existing.get(step.key) === "skipped") continue;
    const scheduledFor = new Date(new Date(shipment.created_at).getTime() + step.hours * 3_600_000);
    if (scheduledFor.getTime() > Date.now()) continue;

    const eligibility = checkEligibility(step, shipment, settings);
    if (eligibility.state !== "pending") {
      await saveStepState(shipment.id, step, scheduledFor, eligibility.state, eligibility.reason);
      continue;
    }

    const draft = step.draft(shipment, settings);
    const result = await sendCustomEmail({
      receiverEmail,
      receiverName: shipment.receiver_name,
      trackingNumber: shipment.tracking_number,
      subject: draft.subject,
      message: draft.message,
      status: shipment.current_status,
      estimatedDeliveryDate: shipment.estimated_delivery_date,
      packageImageUrl: shipment.package_image_url,
    });
    const state: StepState = result.success ? "sent" : "failed";
    await saveStepState(shipment.id, step, scheduledFor, state, result.error || null, draft.subject, result.emailId);
    await supabase.from("shipment_email_logs").insert({
      shipment_id: shipment.id,
      receiver_email: receiverEmail,
      status: `Automation: ${step.key}`,
      subject: draft.subject,
      sent_successfully: result.success,
      error_message: result.error || null,
    });
    if (result.success) sent += 1;
  }
  return sent;
}

function checkEligibility(step: SequenceStep, shipment: Shipment, settings: Settings): { state: StepState; reason: string | null } {
  if (step.minimumStatuses && !step.minimumStatuses.includes(shipment.current_status)) {
    return { state: "deferred", reason: `Waiting for a qualifying shipment status; current status is ${shipment.current_status}.` };
  }
  if ((step.key === "local-depot" || step.key === "delivery-today") && !settings.delivery_time_window) {
    return { state: "blocked", reason: "Add the expected delivery time window before this email can be sent." };
  }
  if (step.financial === "packaging" && settings.packaging_fee_paid) {
    return { state: "skipped", reason: "Packaging and handling charge is already marked paid." };
  }
  if (step.financial === "vat" && settings.vat_fee_paid) {
    return { state: "skipped", reason: "VAT invoice is already marked paid." };
  }
  if (step.financial === "reminder" && settings.packaging_fee_paid && settings.vat_fee_paid) {
    return { state: "skipped", reason: "All recorded charges are paid." };
  }
  if (step.financial) {
    const missing = [
      !settings.payment_deadline ? "payment deadline" : null,
      !settings.payment_instructions ? "payment instructions" : null,
      step.financial !== "packaging" && !settings.seller_legal_name ? "seller legal name" : null,
      step.financial !== "packaging" && !settings.vat_registration_number ? "VAT registration number" : null,
      step.financial !== "packaging" && !settings.vat_invoice_number ? "VAT invoice number" : null,
    ].filter(Boolean);
    if (missing.length) return { state: "blocked", reason: `Missing required invoice details: ${missing.join(", ")}.` };
  }
  return { state: "pending", reason: null };
}

async function saveStepState(
  shipmentId: string,
  step: SequenceStep,
  scheduledFor: Date,
  state: StepState,
  reason: string | null,
  subject?: string,
  emailId?: string,
) {
  const supabase = getSupabaseServiceRole();
  await supabase.from("shipment_automation_email_logs").upsert(
    {
      shipment_id: shipmentId,
      step_key: step.key,
      scheduled_for: scheduledFor.toISOString(),
      state,
      reason,
      subject: subject || null,
      email_id: emailId || null,
      last_checked_at: new Date().toISOString(),
      sent_at: state === "sent" ? new Date().toISOString() : null,
    },
    { onConflict: "shipment_id,step_key" },
  );
}

function deliveryAddress(shipment: Shipment) {
  return [shipment.receiver_address, shipment.receiver_city, shipment.receiver_postcode].filter(Boolean).join(", ");
}

function formatDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "[date]" : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value: string | null) {
  if (!value) return "[deadline]";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "[deadline]" : date.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
}
