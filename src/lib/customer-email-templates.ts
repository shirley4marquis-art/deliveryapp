import type { Shipment } from "@/lib/types";

// Each entry is: identifier, menu label, subject, editable message body.
// Tokens are populated from the selected shipment when a draft is opened.
const templateCatalog = [
  ["status", "Shipment status update", "Shipment update — {tracking}", "We are writing with an update about your shipment {tracking}.\n\nCurrent status: {status}\nEstimated delivery: {date}\n\nYou can use the tracking button in this email to view the latest delivery information."],
  ["vat", "£110 VAT/payment notice", "Action Required — Import VAT Due | Ref: {tracking}", "Your shipment {tracking} is currently being held while the mandatory import VAT assessment is completed.\n\nAn outstanding VAT settlement of £110.00 must be completed before the parcel can be released for onward delivery.\n\nPlease contact the sender to arrange settlement and quote tracking reference {tracking} in all correspondence. Once payment is confirmed, the hold will be removed and delivery will continue."],
  ["address", "Confirm delivery address", "Please confirm your delivery address | Ref: {tracking}", "Please confirm that the delivery address below is correct for shipment {tracking}:\n\n{address}\n\nIf any detail is incorrect, reply to this email as soon as possible so it can be reviewed before dispatch."],
  ["scheduled", "Delivery scheduled", "Delivery scheduled for your shipment | Ref: {tracking}", "Your shipment {tracking} is scheduled for delivery.\n\nEstimated delivery date: {date}\nDelivery address: {address}\n\nPlease ensure someone is available to receive the parcel."],
  ["attempted", "Delivery attempted", "Delivery attempt update | Ref: {tracking}", "We attempted to deliver shipment {tracking}, but the delivery could not be completed.\n\nPlease reply to this email or contact Royal Runs Delivery support to confirm the next available delivery arrangement."],
  ["custom", "Custom email", "Royal Runs Delivery | Ref: {tracking}", ""],

  ["shipment_created", "Shipment created", "Your shipment has been created | Ref: {tracking}", "We have received the information for shipment {tracking}. Tracking is now available, and you can use the tracking button in this email to follow its progress."],
  ["received_origin", "Parcel received at origin facility", "We’ve received your parcel | Ref: {tracking}", "Your parcel {tracking} has been received at our origin facility and has entered the delivery network. We will update its tracking as it progresses."],
  ["shipment_collected", "Shipment collected", "Your shipment has been collected | Ref: {tracking}", "Shipment {tracking} has been collected and is moving to our sorting facility. You can follow its progress using the tracking button in this email."],
  ["shipment_dispatched", "Shipment dispatched", "Your shipment is on its way | Ref: {tracking}", "Shipment {tracking} has been dispatched and is on its way.\n\nCurrent estimated delivery date: {date}"],
  ["departed_origin", "Departed origin facility", "Your parcel has left our origin facility | Ref: {tracking}", "Your parcel {tracking} has left our origin facility and is moving to the next stage of its journey."],
  ["arrived_sorting", "Arrived at sorting facility", "Your parcel has reached our sorting facility | Ref: {tracking}", "Your parcel {tracking} has arrived at our sorting facility for processing before its onward journey."],
  ["sorting_completed", "Sorting completed", "Your parcel has been processed | Ref: {tracking}", "Sorting has been completed for parcel {tracking}. It is ready to continue through the delivery network."],
  ["in_transit", "In transit", "Your shipment is in transit | Ref: {tracking}", "Shipment {tracking} is travelling through our delivery network.\n\nCurrent estimated delivery date: {date}"],
  ["international_transit", "International transit started", "Your shipment has begun its international journey | Ref: {tracking}", "Shipment {tracking} has departed for the destination country. Tracking will be updated as it reaches each processing stage."],
  ["destination_country", "Arrived in destination country", "Your shipment has arrived in the destination country | Ref: {tracking}", "Shipment {tracking} has arrived in the destination country. It will now proceed through local processing and any required customs checks."],
  ["destination_facility", "Received at destination facility", "Your parcel is at our destination facility | Ref: {tracking}", "Parcel {tracking} has been received at our destination facility and is being processed for final delivery."],
  ["transferred_local_depot", "Transferred to local delivery depot", "Your parcel is moving to your local depot | Ref: {tracking}", "Parcel {tracking} is being transferred to the local depot responsible for its final delivery."],
  ["arrived_local_depot", "Arrived at local depot", "Your parcel has reached your local depot | Ref: {tracking}", "Parcel {tracking} has arrived at your local delivery depot.\n\nCurrent estimated delivery date: {date}"],
  ["tracking_updated", "Tracking information updated", "New tracking information is available | Ref: {tracking}", "New tracking information is available for shipment {tracking}.\n\nCurrent status: {status}\n\nUse the tracking button in this email to view the latest activity."],

  ["customs_started", "Customs processing started", "Customs processing has started | Ref: {tracking}", "Shipment {tracking} is undergoing routine customs checks. No action is currently required unless we contact you for additional information."],
  ["customs_completed", "Customs clearance completed", "Your shipment has cleared customs | Ref: {tracking}", "Customs processing for shipment {tracking} is complete. The parcel can now continue through the domestic delivery network."],
  ["customs_delayed", "Customs clearance delayed", "Customs clearance is taking longer than expected | Ref: {tracking}", "Customs processing for shipment {tracking} is taking longer than expected. We will update the tracking information when processing resumes or if any action is required."],
  ["receiver_id_required", "Receiver identification required", "Identification required for customs clearance | Ref: {tracking}", "Customs requires valid receiver identification or an identification number to process shipment {tracking}. Please reply so our support team can advise you how to provide it securely."],
  ["customs_info_required", "Additional customs information required", "Information required to clear your shipment | Ref: {tracking}", "Additional information is required to clear shipment {tracking} through customs. Please reply with the following details:\n\n[required customs information]"],
  ["proof_purchase_required", "Proof of purchase required", "Proof of purchase required | Ref: {tracking}", "Please provide an invoice, receipt, or order confirmation showing the purchase details for shipment {tracking}. This is required to continue customs clearance."],
  ["contents_confirmation", "Shipment contents confirmation", "Please confirm the contents of your shipment | Ref: {tracking}", "Please reply with a clear description of the contents of shipment {tracking}, including the purpose and quantity of each item, so customs processing can continue."],
  ["customs_value_confirmation", "Customs value confirmation", "Please confirm your shipment’s value | Ref: {tracking}", "Please confirm the declared value of shipment {tracking} and provide supporting purchase documentation if available."],
  ["import_duties_calculated", "Import duties calculated", "Import charges are available | Ref: {tracking}", "Import duties and taxes have been assessed for shipment {tracking}.\n\nAmount due: [amount]\nPayment instructions: [official payment instructions]\n\nPayment is required before the shipment can be released."],
  ["import_payment_reminder", "Import payment reminder", "Reminder: Import charges remain unpaid | Ref: {tracking}", "Import charges of [amount] for shipment {tracking} remain unpaid. Please complete payment using the official payment instructions so the parcel can be released."],
  ["import_payment_received", "Import payment received", "Your import payment has been received | Ref: {tracking}", "We have received your import payment for shipment {tracking}. Customs release and onward delivery processing will now continue."],
  ["payment_unsuccessful", "Payment unsuccessful", "We couldn’t process your import payment | Ref: {tracking}", "We could not process the import payment for shipment {tracking}. Please retry using the official payment page or contact Royal Runs Delivery support for assistance."],
  ["released_customs", "Shipment released by customs", "Your shipment has been released by customs | Ref: {tracking}", "Shipment {tracking} has been released by customs and is entering the domestic delivery network."],
  ["restricted_item_review", "Restricted item review", "Your shipment requires an additional review | Ref: {tracking}", "An item in shipment {tracking} requires additional review by customs or the relevant regulatory authority. We will contact you if supporting information is needed."],

  ["address_incomplete", "Address incomplete", "Your delivery address is incomplete | Ref: {tracking}", "The delivery address for shipment {tracking} is incomplete.\n\nAddress currently held: {address}\n\nPlease reply with the missing building number, street, city, postcode, and any other relevant details."],
  ["address_unverified", "Address could not be verified", "Please verify your delivery address | Ref: {tracking}", "We could not verify the following delivery address for shipment {tracking}:\n\n{address}\n\nPlease reply to confirm or correct the full address."],
  ["postcode_required", "Postcode confirmation required", "Please confirm your delivery postcode | Ref: {tracking}", "Please confirm or correct the postcode for shipment {tracking}.\n\nDelivery address currently held: {address}"],
  ["phone_required", "Phone number required", "Please provide a delivery contact number | Ref: {tracking}", "Please reply with a telephone number the courier can use to coordinate delivery of shipment {tracking}."],
  ["instructions_requested", "Delivery instructions requested", "Add delivery instructions for your parcel | Ref: {tracking}", "Please provide any gate codes, access directions, reception details, safe-location preferences, or other instructions that will help us deliver shipment {tracking} to {address}."],
  ["address_updated", "Address updated successfully", "Your delivery address has been updated | Ref: {tracking}", "The delivery address for shipment {tracking} has been updated successfully.\n\nUpdated address: {address}\n\nPlease contact us promptly if any detail is incorrect."],
  ["instructions_updated", "Delivery instructions updated", "Your delivery instructions have been saved | Ref: {tracking}", "Your delivery instructions for shipment {tracking} have been recorded and will be shared with the delivery team."],
  ["address_change_failed", "Unable to change address", "We couldn’t update your delivery address | Ref: {tracking}", "We could not update the delivery address for shipment {tracking}.\n\nReason: [reason]\nAvailable options: [available delivery or collection options]\n\nPlease contact support if you need assistance."],

  ["choose_delivery_date", "Choose a delivery date", "Choose a delivery date for your shipment | Ref: {tracking}", "Shipment {tracking} is ready to be scheduled. Please reply with your preferred option from the available dates below:\n\n[available delivery dates]"],
  ["choose_delivery_window", "Choose a delivery time window", "Select your preferred delivery time | Ref: {tracking}", "Please select your preferred available time window for shipment {tracking}:\n\n[available time windows]"],
  ["delivery_date_confirmed", "Delivery date confirmed", "Your delivery date is confirmed | Ref: {tracking}", "The delivery date for shipment {tracking} is confirmed.\n\nDelivery date: {date}\nDelivery address: {address}"],
  ["delivery_window_confirmed", "Delivery time window confirmed", "Your delivery window is confirmed | Ref: {tracking}", "The expected delivery window for shipment {tracking} is confirmed.\n\nDelivery date: {date}\nTime window: [time window]"],
  ["delivery_reminder", "Delivery reminder", "Reminder: Your parcel is due tomorrow | Ref: {tracking}", "Shipment {tracking} is due for delivery tomorrow to {address}. Please ensure someone is available or contact us to update your delivery instructions."],
  ["delivery_today", "Delivery today", "Your parcel is due for delivery today | Ref: {tracking}", "Shipment {tracking} is due for delivery today.\n\nExpected time window: [time window]\nDelivery address: {address}"],
  ["courier_en_route", "Courier en route", "Your courier is on the way | Ref: {tracking}", "The courier carrying shipment {tracking} is travelling to {address}. Please ensure the delivery location is accessible."],
  ["next_delivery_stop", "Next delivery stop", "Your parcel is the courier’s next stop | Ref: {tracking}", "Shipment {tracking} is the courier’s next scheduled stop. Please be ready to receive the parcel."],
  ["courier_delayed", "Courier delayed", "Your courier is running late | Ref: {tracking}", "The courier delivering shipment {tracking} is running later than planned. Delivery is still expected, with a revised arrival time of [revised time window]."],
  ["carrier_rescheduled", "Delivery rescheduled by carrier", "Your delivery has been rescheduled | Ref: {tracking}", "Delivery of shipment {tracking} has been rescheduled.\n\nNew delivery date: {date}\nReason: [reason, if available]"],
  ["receiver_rescheduled", "Receiver-requested rescheduling confirmed", "Your new delivery date is confirmed | Ref: {tracking}", "Your rescheduling request for shipment {tracking} has been confirmed.\n\nNew delivery date: {date}\nDelivery address: {address}"],
  ["hold_collection_confirmed", "Hold for collection confirmed", "Your hold-for-collection request is confirmed | Ref: {tracking}", "Your request to hold shipment {tracking} for collection has been confirmed. We will contact you when the parcel is ready at the approved collection location."],
  ["ready_collection", "Parcel ready for collection", "Your parcel is ready for collection | Ref: {tracking}", "Shipment {tracking} is ready for collection.\n\nCollection address: [collection address]\nOpening hours: [opening hours]\nCollect by: [collection deadline]\nIdentification required: [identification requirements]"],
  ["collection_reminder", "Collection reminder", "Reminder: Your parcel is waiting for collection | Ref: {tracking}", "Shipment {tracking} is still waiting for collection at [collection address]. Please collect it before [collection deadline]."],
  ["collection_deadline", "Collection deadline approaching", "Action required: Collection deadline approaching | Ref: {tracking}", "Please collect shipment {tracking} by [date]. If it is not collected before the holding period expires, it may be returned."],

  ["delivery_delayed", "Delivery delayed", "Your delivery has been delayed | Ref: {tracking}", "Delivery of shipment {tracking} has been delayed.\n\nRevised estimated delivery date: {date}\nReason: [reason, if available]\n\nWe apologise for the disruption."],
  ["weather_delay", "Weather delay", "Weather is affecting your delivery | Ref: {tracking}", "Severe weather has interrupted the planned movement of shipment {tracking}.\n\nRevised estimated delivery date: {date}\n\nTracking will be updated as conditions improve."],
  ["operational_delay", "Operational delay", "An operational delay is affecting your shipment | Ref: {tracking}", "A processing or transport disruption is affecting shipment {tracking}.\n\nRevised estimated delivery date: {date}\n\nWe will provide another update when movement resumes."],
  ["vehicle_disruption", "Vehicle disruption", "A transport issue has delayed your delivery | Ref: {tracking}", "A courier or vehicle issue has affected the schedule for shipment {tracking}.\n\nRevised estimated delivery date: {date}\n\nWe apologise for the delay."],
  ["access_problem", "Access problem at delivery address", "We need help accessing your delivery address | Ref: {tracking}", "We need additional information to access the delivery address for shipment {tracking}:\n\n{address}\n\nPlease reply with any entry code, directions, reception details, or other access instructions."],
  ["business_closed", "Business closed", "Delivery could not be completed—the premises were closed | Ref: {tracking}", "We could not deliver shipment {tracking} because the premises at {address} were closed. Please reply to arrange another delivery date."],
  ["no_safe_location", "No safe delivery location", "We couldn’t find a safe place for your parcel | Ref: {tracking}", "We could not safely leave shipment {tracking} at the delivery address. Please reply to arrange redelivery or provide suitable delivery instructions."],
  ["parcel_damaged", "Parcel damaged in transit", "An issue has been identified with your parcel | Ref: {tracking}", "Damage has been identified on shipment {tracking} during transit. The parcel is being inspected. We will contact you with the outcome and any available claim or delivery options."],
  ["held_for_instructions", "Shipment held for receiver instructions", "Your instructions are required | Ref: {tracking}", "Movement of shipment {tracking} has paused while we wait for your instructions. Please reply to choose from the following available options:\n\n[delivery, collection, return, or support options]"],
] as const;

export type EmailType = (typeof templateCatalog)[number][0];

const customsTypes = new Set<string>([
  "vat",
  "customs_started",
  "customs_completed",
  "customs_delayed",
  "receiver_id_required",
  "customs_info_required",
  "proof_purchase_required",
  "contents_confirmation",
  "customs_value_confirmation",
  "import_duties_calculated",
  "import_payment_reminder",
  "import_payment_received",
  "payment_unsuccessful",
  "released_customs",
  "restricted_item_review",
]);

const receiverActionTypes = new Set<string>([
  "vat",
  "address",
  "attempted",
  "receiver_id_required",
  "customs_info_required",
  "proof_purchase_required",
  "contents_confirmation",
  "customs_value_confirmation",
  "import_duties_calculated",
  "import_payment_reminder",
  "payment_unsuccessful",
  "address_incomplete",
  "address_unverified",
  "postcode_required",
  "phone_required",
  "instructions_requested",
  "address_change_failed",
  "choose_delivery_date",
  "choose_delivery_window",
  "collection_reminder",
  "collection_deadline",
  "access_problem",
  "business_closed",
  "no_safe_location",
  "held_for_instructions",
]);

const addressTypes = new Set<string>([
  "address",
  "address_incomplete",
  "address_unverified",
  "postcode_required",
  "phone_required",
  "instructions_requested",
  "address_updated",
  "instructions_updated",
  "address_change_failed",
]);

const deliveryPlanningTypes = new Set<string>([
  "scheduled",
  "choose_delivery_date",
  "choose_delivery_window",
  "delivery_date_confirmed",
  "delivery_window_confirmed",
  "delivery_reminder",
  "delivery_today",
  "courier_en_route",
  "next_delivery_stop",
  "courier_delayed",
  "carrier_rescheduled",
  "receiver_rescheduled",
  "hold_collection_confirmed",
  "ready_collection",
  "collection_reminder",
  "collection_deadline",
]);

const exceptionTypes = new Set<string>([
  "attempted",
  "customs_delayed",
  "payment_unsuccessful",
  "address_change_failed",
  "courier_delayed",
  "delivery_delayed",
  "weather_delay",
  "operational_delay",
  "vehicle_disruption",
  "access_problem",
  "business_closed",
  "no_safe_location",
  "parcel_damaged",
  "held_for_instructions",
]);

export const emailTypes: ReadonlyArray<{ value: EmailType; label: string }> =
  templateCatalog.map(([value, label]) => ({ value, label }));

export type EmailDraft = {
  shipment: Shipment;
  type: EmailType;
  subject: string;
  message: string;
};

export function createEmailDraft(shipment: Shipment, type: EmailType): EmailDraft {
  const template = templateCatalog.find(([value]) => value === type);
  if (!template) throw new Error(`Unknown customer email template: ${type}`);

  const address = [shipment.receiver_address, shipment.receiver_city, shipment.receiver_postcode]
    .filter(Boolean)
    .join(", ");
  const values: Record<string, string> = {
    name: shipment.receiver_name || "Customer",
    tracking: shipment.tracking_number,
    date: formatDate(shipment.estimated_delivery_date),
    address,
    status: shipment.current_status,
  };
  const populate = (text: string) =>
    text.replace(/\{(name|tracking|date|address|status)\}/g, (_, key: string) => values[key]);
  const body = populate(template[3]);
  const professionalDetail = getProfessionalDetail(type, values.tracking);

  return {
    shipment,
    type,
    subject: populate(template[2]),
    message: `Dear ${values.name},\n\n${body}${professionalDetail}\n\nKind regards,\nRoyal Runs Delivery`,
  };
}

function getProfessionalDetail(type: EmailType, tracking: string) {
  if (type === "custom") {
    return `Please find an important update regarding shipment ${tracking} below.\n\n[Enter the full customer message here, including any action required and relevant deadline.]\n\nIf you have any questions after reviewing this update, please reply directly to this email and a member of our team will assist you.`;
  }

  let detail: string;

  if (exceptionTypes.has(type)) {
    detail = `\n\nWhat happens next\nOur operations team is reviewing the shipment and will continue working to resolve the issue as quickly as possible. Any revised delivery information or further requirements will be added to the tracking record.`;
  } else if (customsTypes.has(type)) {
    detail = `\n\nWhat happens next\nOur Customs & Clearance Team will continue monitoring the shipment throughout the clearance process. Once the required checks or actions are complete, the tracking record will be updated and the parcel will proceed to the next available stage.`;
  } else if (addressTypes.has(type)) {
    detail = `\n\nWhy accurate details matter\nComplete and accurate receiver information helps the courier locate the address, contact the receiver when necessary, and avoid preventable delays or unsuccessful delivery attempts.`;
  } else if (deliveryPlanningTypes.has(type)) {
    detail = `\n\nDelivery arrangements\nPlease ensure the delivery address remains accessible and that someone is available where a signature or handover is required. You can review the latest timing and delivery progress through the tracking button in this email.`;
  } else {
    detail = `\n\nWhat happens next\nWe will continue monitoring the shipment as it moves through the delivery network. The tracking record will be updated whenever the parcel reaches another important stage.`;
  }

  if (receiverActionTypes.has(type)) {
    detail += `\n\nAction required\nPlease review the information above carefully and complete the requested action as soon as possible. When replying, include tracking reference ${tracking} so our team can identify the shipment and respond without unnecessary delay.`;
  }

  return `${detail}\n\nYou can use the tracking button in this email to view the latest available information. If you need assistance, reply directly to this message and quote reference ${tracking}; a member of the Royal Runs Delivery team will be happy to help.`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value || "[date]";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
