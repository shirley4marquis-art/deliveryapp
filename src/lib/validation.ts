import { parcelStatuses, type ParcelStatus, type ShipmentInput } from "./types";
import { isValidTrackingNumber, normaliseTrackingNumber } from "./tracking";

const requiredShipmentFields: Array<keyof ShipmentInput> = [
  "tracking_number",
  "sender_name",
  "sender_address",
  "receiver_name",
  "receiver_address",
  "package_type",
  "weight",
  "delivery_service",
  "current_status",
  "estimated_delivery_date",
];

export function parseShipmentInput(body: Record<string, unknown>) {
  const pickupLat = parseCoordinate(body.pickup_lat);
  const pickupLng = parseCoordinate(body.pickup_lng);
  const deliveryLat = parseCoordinate(body.delivery_lat);
  const deliveryLng = parseCoordinate(body.delivery_lng);
  const currentLat = parseCoordinate(body.current_lat);
  const currentLng = parseCoordinate(body.current_lng);

  const receiverEmailRaw = String(body.receiver_email || "").trim().toLowerCase();

  const shipment = {
    tracking_number: normaliseTrackingNumber(String(body.tracking_number || "")),
    sender_name: String(body.sender_name || "").trim(),
    sender_address: String(body.sender_address || "").trim(),
    sender_city: String(body.sender_city || "").trim(),
    sender_place_id: String(body.sender_place_id || "").trim() || null,
    receiver_name: String(body.receiver_name || "").trim(),
    receiver_email: receiverEmailRaw || null,
    receiver_address: String(body.receiver_address || "").trim(),
    receiver_city: String(body.receiver_city || "").trim(),
    receiver_postcode: String(body.receiver_postcode || "").trim().toUpperCase(),
    receiver_place_id: String(body.receiver_place_id || "").trim() || null,
    package_type: String(body.package_type || "").trim(),
    weight: String(body.weight || "").trim(),
    delivery_service: String(body.delivery_service || "").trim(),
    current_status: String(body.current_status || "") as ParcelStatus,
    estimated_delivery_date: String(body.estimated_delivery_date || "").trim(),
    notes: String(body.notes || "").trim() || null,
    pickup_lat: pickupLat.value,
    pickup_lng: pickupLng.value,
    delivery_lat: deliveryLat.value,
    delivery_lng: deliveryLng.value,
    current_lat: currentLat.value,
    current_lng: currentLng.value,
  };

  if (receiverEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmailRaw)) {
    return { error: "Receiver email address is not valid." };
  }

  const coordinateError =
    pickupLat.error ||
    pickupLng.error ||
    deliveryLat.error ||
    deliveryLng.error ||
    currentLat.error ||
    currentLng.error;

  if (coordinateError) {
    return { error: coordinateError };
  }

  for (const field of requiredShipmentFields) {
    if (!shipment[field]) {
      return { error: "Please complete all required shipment fields." };
    }
  }

  if (!isValidTrackingNumber(shipment.tracking_number)) {
    return { error: "Tracking number must use the format RR123456789GB." };
  }

  if (!parcelStatuses.includes(shipment.current_status)) {
    return { error: "Please choose a valid parcel status." };
  }

  return { shipment };
}

function parseCoordinate(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return { value: null };
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return { error: "Map coordinates must be valid numbers.", value: null };
  }

  return { value: parsed };
}

export function parseTrackingEventInput(body: Record<string, unknown>) {
  const eventDate = String(body.event_date || "").trim();
  const eventClock = String(body.event_clock || body.event_time || "").trim();
  const event = {
    event_time:
      eventDate && eventClock
        ? new Date(`${eventDate}T${eventClock}`).toISOString()
        : "",
    location: String(body.location || "").trim(),
    status: String(body.status || "") as ParcelStatus,
    description: String(body.description || body.notes || "").trim() || null,
  };

  if (!event.event_time || !event.location || !event.status) {
    return { error: "Please complete date, time, location, and status." };
  }

  if (!parcelStatuses.includes(event.status)) {
    return { error: "Please choose a valid parcel status." };
  }

  return { event };
}
