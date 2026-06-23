export function generateTrackingNumber() {
  const digits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");

  return `RR${digits}GB`;
}

export function normaliseTrackingNumber(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidTrackingNumber(value: string) {
  return /^RR\d{9}GB$/.test(normaliseTrackingNumber(value));
}
