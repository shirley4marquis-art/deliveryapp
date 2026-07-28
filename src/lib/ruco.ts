export const RUCO_SUPPLY_CUSTOMERS = [
  "Jayden Chibuzo",
  "Kunal Kapadia",
  "Coy Hetherington",
  "Harvey Bayes",
] as const;

function normalise(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function isRucoSupplyCustomer(receiverName: string | null | undefined) {
  const receiver = normalise(receiverName);
  return RUCO_SUPPLY_CUSTOMERS.some((name) => normalise(name) === receiver);
}

export function isRucoSupplyShipment(shipment: {
  receiver_name?: string | null;
  sender_name?: string | null;
}) {
  return (
    normalise(shipment.sender_name) === "ruco supply" ||
    isRucoSupplyCustomer(shipment.receiver_name)
  );
}
