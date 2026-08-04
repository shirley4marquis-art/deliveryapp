export type ImportedOrder = {
  source: "Ruco Supply" | "1:1 Connect" | "Unclassified";
  orderReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostcode: string;
  country: string;
  items: string[];
  courier: string;
  total: string;
  notes: string;
};

function valueAfterLabel(text: string, label: string) {
  const match = text.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function extractEmail(text: string) {
  return text.match(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i)?.[0]?.trim() || "";
}

function extractGenericAddress(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const addressIndex = lines.findIndex((line) => /^(?:delivery\s+)?address\s*:/i.test(line));

  if (addressIndex >= 0) {
    const addressLines = [
      lines[addressIndex].replace(/^(?:delivery\s+)?address\s*:\s*/i, ""),
    ];
    for (let index = addressIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^(?:name|email|e-mail|phone|telephone)\s*:/i.test(line)) break;
      if (line) addressLines.push(line);
    }
    return addressLines.filter(Boolean).join(", ");
  }

  const emailIndex = lines.findIndex((line) => /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i.test(line));
  if (emailIndex > 1) {
    return lines.slice(1, emailIndex).filter(Boolean).join(", ");
  }
  return "";
}

function extractPostcode(text: string) {
  return (
    text.match(/\b(?:GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)?.[0]
      ?.toUpperCase()
      .replace(/\s+/g, " ") || ""
  );
}

function linesBetween(text: string, start: RegExp, end: RegExp) {
  const lines = text.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => start.test(line.trim()));
  if (startIndex < 0) return [];
  const result: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (end.test(line)) break;
    if (line) result.push(line);
  }
  return result;
}

function extractItems(text: string) {
  const productMatches = [
    ...text.matchAll(/Product:\s*([^\n]+)\n\s*(?:Variant\/Colour:[^\n]+\n\s*)?Quantity:\s*(\d+)/gi),
  ];
  if (productMatches.length) {
    return productMatches.map((match) => {
      const product = match[1].replace(/^\d+\.\s*/, "").trim();
      return `${product} × ${match[2]}`;
    });
  }

  return [
    ...text.matchAll(/(?:^|\n)\s*\d+\.\s*([^\n]+)\n\s*Quantity:\s*(\d+)/gi),
  ].map((match) => `${match[1].trim()} × ${match[2]}`);
}

export function parsePastedOrder(raw: string): ImportedOrder {
  const text = raw.trim();
  const isRuco = /RUCO SUPPLY\s*[—-]\s*NEW CHECKOUT REQUEST/i.test(text);
  const isConnect = /NEW ORDER\s*[—-]\s*1:1 CONNECT/i.test(text);
  const source = isRuco
    ? "Ruco Supply"
    : isConnect
      ? "1:1 Connect"
      : "Unclassified";

  const deliveryLines = isRuco
    ? linesBetween(text, /^Delivery Address$/i, /^Order Items$/i)
    : linesBetween(text, /^Delivery:$/i, /^Billing:$/i)
        .map((line) => line.replace(/^Address\s*\/\s*Locker:\s*/i, ""))
        .filter((line) => !/^Carrier:/i.test(line));

  const deliveryAddress = deliveryLines.join(", ") || extractGenericAddress(text);
  const postcode = extractPostcode(deliveryAddress);
  const addressWithoutPostcode = deliveryAddress.replace(postcode, "").trim();
  const addressParts = addressWithoutPostcode
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const recognisedCity =
    addressWithoutPostcode.match(
      /\b(London|Manchester|Birmingham|Liverpool|Leeds|Glasgow|Edinburgh|Cardiff|Bristol|Toronto|Vancouver|Montreal|New York|Los Angeles|Chicago)\b/i,
    )?.[1] || "";

  const total =
    valueAfterLabel(text, isRuco ? "Final total" : "Order Total") ||
    valueAfterLabel(text, "Total");
  const orderReference = valueAfterLabel(text, "Order reference");
  const customerName =
    valueAfterLabel(text, "Name") ||
    (!isRuco && !isConnect
      ? text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line && !/:/.test(line) && !/@/.test(line)) || ""
      : "");
  const customerEmail = valueAfterLabel(text, "Email") || extractEmail(text);
  const customerPhone = valueAfterLabel(text, "Phone");
  const courier =
    valueAfterLabel(text, isRuco ? "Courier" : "Carrier") ||
    "Standard delivery";
  const country =
    valueAfterLabel(text, "Country") ||
    deliveryLines.find((line) => /United Kingdom|Canada|United States/i.test(line)) ||
    "UK";
  const items = extractItems(text);

  return {
    source,
    orderReference,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    deliveryCity: recognisedCity || addressParts.at(-1) || "",
    deliveryPostcode: postcode,
    country,
    items,
    courier,
    total,
    notes: [
      orderReference ? `Order reference: ${orderReference}` : "",
      items.length ? `Items: ${items.join("; ")}` : "",
      total ? `Order total: ${total}` : "",
      customerPhone ? `Customer phone: ${customerPhone}` : "",
      `Imported from ${source} pasted order.`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
