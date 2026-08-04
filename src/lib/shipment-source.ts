import { isRucoSupplyShipment } from "./ruco";

export const shipmentSources = ["ruco", "one-connect", "unclassified"] as const;
export type ShipmentSource = (typeof shipmentSources)[number];

type SourceShipment = {
  order_source?: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  notes?: string | null;
};

export function getShipmentSource(shipment: SourceShipment): ShipmentSource {
  const storedSource = (shipment.order_source || "").trim().toLowerCase();
  if (
    storedSource === "ruco" ||
    storedSource === "ruco-supply" ||
    storedSource === "ruco supply"
  ) {
    return "ruco";
  }
  if (
    storedSource === "mroneconnect.shop" ||
    storedSource === "one-connect" ||
    storedSource === "1:1-connect" ||
    storedSource === "1:1 connect"
  ) {
    return "one-connect";
  }
  const senderName = (shipment.sender_name || "").trim().toLowerCase();
  if (senderName === "1:1 connect") return "one-connect";
  const notes = (shipment.notes || "").toLowerCase();
  if (
    notes.includes("imported from ruco supply") ||
    notes.includes("telegram source: ruco")
  ) {
    return "ruco";
  }
  if (
    notes.includes("imported from 1:1 connect") ||
    notes.includes("telegram source: one-connect")
  ) {
    return "one-connect";
  }
  return isRucoSupplyShipment(shipment) ? "ruco" : "unclassified";
}

export function sourceLabel(source: ShipmentSource) {
  if (source === "ruco") return "Ruco Supply";
  return source === "one-connect" ? "1:1 Connect" : "Unclassified";
}

export function sourceStorageValue(senderName: string) {
  return ["ruco supply", "ruco"].includes(senderName.trim().toLowerCase())
    ? "ruco-supply"
    : senderName.trim().toLowerCase() === "1:1 connect"
      ? "1:1-connect"
      : null;
}
