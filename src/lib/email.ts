import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL || "Royal Runs Delivery <office@royalruns.co.uk>";
const SITE_URL = process.env.SITE_URL || "https://royalruns.co.uk";
const SUPPORT_EMAIL = "office@royalruns.co.uk";

export type EmailData = {
  receiverName: string;
  receiverEmail: string;
  receiverAddress: string;
  receiverCity: string;
  receiverPostcode: string;
  trackingNumber: string;
  status: string;
  estimatedDeliveryDate: string;
  shipmentId: string;
};

type StatusConfig = {
  emoji: string;
  headline: string;
  bodyText: string;
  headerColor: string;
};

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  "Shipment Created": {
    emoji: "📦",
    headline: "We've Got It",
    bodyText:
      "Your shipment has been registered in our system and we have all the details we need. You'll receive further updates as your parcel moves through our network.",
    headerColor: "#0047bb",
  },
  "Parcel Collected": {
    emoji: "🚐",
    headline: "Parcel Collected",
    bodyText:
      "Your parcel has been collected by a TBC courier and is now in our hands. We'll keep you updated as it travels to you.",
    headerColor: "#0047bb",
  },
  "At Local Depot": {
    emoji: "🏢",
    headline: "At Local Depot",
    bodyText:
      "Your parcel has arrived at a TBC local depot and is being processed ready for onward transit. Updates will follow shortly.",
    headerColor: "#0047bb",
  },
  "In Transit": {
    emoji: "🚚",
    headline: "On Its Way",
    bodyText:
      "Great news — your parcel is in transit and moving towards its destination. We'll notify you when there's a further update.",
    headerColor: "#0047bb",
  },
  "Arrived at Sorting Facility": {
    emoji: "🏭",
    headline: "At Sorting Facility",
    bodyText:
      "Your parcel has arrived at one of our sorting facilities. It will be dispatched for delivery to you very soon.",
    headerColor: "#0047bb",
  },
  "Customs/Processing Check": {
    emoji: "🔍",
    headline: "Customs & Processing Check",
    bodyText:
      "Your parcel is currently undergoing a standard customs or processing check. This is a routine step and should be completed shortly. No action is required from you.",
    headerColor: "#7c3aed",
  },
  "Out for Delivery": {
    emoji: "🛵",
    headline: "Out for Delivery Today",
    bodyText:
      "Your parcel is out for delivery today! Please ensure someone is available at the delivery address to receive it. Our courier will attempt delivery shortly.",
    headerColor: "#059669",
  },
  "Delivery Attempted": {
    emoji: "🔔",
    headline: "Delivery Attempted",
    bodyText:
      "We attempted to deliver your parcel but were unable to complete the delivery. Please contact TBC support or check your tracking page for next steps and re-delivery options.",
    headerColor: "#d97706",
  },
  Delivered: {
    emoji: "✅",
    headline: "Delivered",
    bodyText:
      "Your parcel has been successfully delivered. We hope everything is in perfect condition. Thank you for choosing TBC — we look forward to serving you again.",
    headerColor: "#059669",
  },
  "On Hold": {
    emoji: "⏸️",
    headline: "Shipment On Hold",
    bodyText:
      `Your parcel is currently on hold. Please contact TBC support at ${SUPPORT_EMAIL} or call 07346 535643 for more information and to resolve the hold.`,
    headerColor: "#dc2626",
  },
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function generateEmailHtml(data: EmailData, config: StatusConfig): string {
  const trackingLink = `${SITE_URL}/track?q=${encodeURIComponent(data.trackingNumber)}`;
  const deliveryAddress = [data.receiverAddress, data.receiverCity, data.receiverPostcode]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TBC — ${config.headline}</title>
</head>
<body style="margin:0;padding:0;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:${config.headerColor};padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 12px;margin-bottom:10px;">
                      <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">TBC</span>
                    </div>
                    <p style="color:rgba(255,255,255,0.75);margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">Royal Mail Branch Delivery Service</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="background:${config.headerColor};padding:0 36px 28px;">
              <div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:18px 20px;">
                <p style="color:#ffffff;margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px;">${config.emoji} ${config.headline}</p>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="color:#07152f;font-size:16px;margin:0 0 8px;">Hello <strong>${data.receiverName}</strong>,</p>
              <p style="color:#10213f;font-size:15px;line-height:1.6;margin:0 0 28px;">${config.bodyText}</p>

              <!-- Tracking Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7ff;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="color:#0047bb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 16px;">Shipment Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#334967;font-size:13px;font-weight:700;padding:6px 0;width:40%;vertical-align:top;">Tracking Number</td>
                        <td style="color:#07152f;font-size:14px;font-family:monospace;font-weight:700;padding:6px 0;letter-spacing:0.05em;">${data.trackingNumber}</td>
                      </tr>
                      <tr>
                        <td style="color:#334967;font-size:13px;font-weight:700;padding:6px 0;vertical-align:top;">Current Status</td>
                        <td style="color:${config.headerColor};font-size:14px;font-weight:700;padding:6px 0;">${data.status}</td>
                      </tr>
                      <tr>
                        <td style="color:#334967;font-size:13px;font-weight:700;padding:6px 0;vertical-align:top;">Delivery Address</td>
                        <td style="color:#07152f;font-size:13px;padding:6px 0;line-height:1.5;">${deliveryAddress}</td>
                      </tr>
                      <tr>
                        <td style="color:#334967;font-size:13px;font-weight:700;padding:6px 0;vertical-align:top;">Est. Delivery</td>
                        <td style="color:#07152f;font-size:13px;padding:6px 0;">${formatDate(data.estimatedDeliveryDate)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${trackingLink}"
                       style="display:inline-block;background:#0047bb;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">
                      Track Your Parcel →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#50627f;font-size:13px;margin:28px 0 0;text-align:center;">
                Or copy this link into your browser:<br/>
                <a href="${trackingLink}" style="color:#0047bb;word-break:break-all;">${trackingLink}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px;background:#f8faff;">
              <p style="color:#07152f;font-size:14px;font-weight:700;margin:0 0 4px;">TBC Courier Service</p>
              <p style="color:#50627f;font-size:12px;margin:0 0 2px;">📧 ${SUPPORT_EMAIL}</p>
              <p style="color:#50627f;font-size:12px;margin:0 0 12px;">📞 07346 535643</p>
              <p style="color:#9bb8ea;font-size:11px;margin:0;">
                This email was sent because a TBC shipment with tracking number
                <strong>${data.trackingNumber}</strong> has been updated.
                If you believe this was sent in error, please contact us.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type SendEmailResult = {
  success: boolean;
  emailId?: string;
  error?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendCustomEmail({
  receiverEmail,
  receiverName,
  subject,
  message,
  trackingNumber,
  status,
  estimatedDeliveryDate,
}: {
  receiverEmail: string;
  receiverName: string;
  subject: string;
  message: string;
  trackingNumber: string;
  status: string;
  estimatedDeliveryDate: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY is not configured." };

  const trackingLink = `${SITE_URL}/track?q=${encodeURIComponent(trackingNumber)}`;
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;color:#07152f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7ff;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(7,21,47,.12)">
        <tr>
          <td style="background:#07152f;padding:28px 36px;border-bottom:5px solid #ef3340">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="color:#ffffff;font-size:25px;font-weight:900;letter-spacing:-.5px">Royal Runs</div>
                  <div style="margin-top:5px;color:#9bb8ea;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Delivery &amp; Parcel Services</div>
                </td>
                <td align="right"><span style="display:inline-block;background:#0047bb;color:#ffffff;border-radius:999px;padding:8px 13px;font-size:11px;font-weight:700">SHIPMENT UPDATE</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:38px 36px 30px">
            <p style="margin:0 0 16px;color:#07152f;font-size:17px">Hello <strong>${escapeHtml(receiverName)}</strong>,</p>
            <div style="color:#10213f;font-size:15px;line-height:1.75">${escapeHtml(message).replaceAll("\n", "<br>")}</div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f7faff;border:1px solid #c8d9f5;border-radius:10px">
              <tr><td style="padding:22px 24px">
                <div style="margin-bottom:14px;color:#0047bb;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Shipment details</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:5px 0;color:#50627f;font-size:13px">Tracking number</td><td align="right" style="padding:5px 0;color:#07152f;font-family:monospace;font-size:14px;font-weight:800">${escapeHtml(trackingNumber)}</td></tr>
                  <tr><td style="padding:5px 0;color:#50627f;font-size:13px">Current status</td><td align="right" style="padding:5px 0;color:#0047bb;font-size:13px;font-weight:800">${escapeHtml(status)}</td></tr>
                  <tr><td style="padding:5px 0;color:#50627f;font-size:13px">Estimated delivery</td><td align="right" style="padding:5px 0;color:#07152f;font-size:13px;font-weight:700">${escapeHtml(formatDate(estimatedDeliveryDate))}</td></tr>
                </table>
              </td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
              <tr><td align="center">
                <a href="${trackingLink}" style="display:inline-block;background:#0047bb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:800">Track your shipment →</a>
              </td></tr>
            </table>
            <p style="margin:22px 0 0;text-align:center;color:#50627f;font-size:11px;line-height:1.6">For your security, verify any payment instructions directly with Royal Runs Delivery before making a payment.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#07152f;padding:24px 36px;color:#ffffff">
            <div style="font-size:14px;font-weight:800">Royal Runs Delivery</div>
            <div style="margin-top:6px;color:#9bb8ea;font-size:12px">${SUPPORT_EMAIL} · 07346 535643</div>
            <div style="margin-top:12px;color:#6f8dbd;font-size:10px;line-height:1.5">This message relates to shipment ${escapeHtml(trackingNumber)}. Please contact us if you believe it was sent in error.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({ from: FROM, to: receiverEmail, subject, html });
    if (result.error) return { success: false, error: result.error.message || JSON.stringify(result.error) };
    return { success: true, emailId: result.data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown email error." };
  }
}

export async function sendStatusEmail(data: EmailData): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured." };
  }

  const config = STATUS_CONFIGS[data.status] ?? {
    emoji: "📦",
    headline: data.status,
    bodyText: "Your TBC shipment has been updated. Please check the details below.",
    headerColor: "#0047bb",
  };

  const subject = `TBC Update: ${data.status} — Tracking ${data.trackingNumber}`;
  const html = generateEmailHtml(data, config);

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: FROM,
      to: data.receiverEmail,
      subject,
      html,
    });

    if (result.error) {
      // Pass the full Resend error message so the admin sees the real reason
      const msg = result.error.message || JSON.stringify(result.error);
      return { success: false, error: msg };
    }

    return { success: true, emailId: result.data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error.",
    };
  }
}

// ─── Customs Charge Email ─────────────────────────────────────────────────────

export type CustomsEmailData = {
  receiverName: string;
  receiverEmail: string;
  trackingNumber: string;
  senderName: string;
  chargeAmount: string; // e.g. "150.00"
  shipmentId: string;
};

function generateCustomsHtml(data: CustomsEmailData): string {
  const trackingLink = `${SITE_URL}/track?q=${encodeURIComponent(data.trackingNumber)}`;
  const amount = data.chargeAmount.startsWith("£")
    ? data.chargeAmount
    : `£${data.chargeAmount}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Action Required — Import VAT Due</title>
</head>
<body style="margin:0;padding:0;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:#07152f;padding:28px 36px;">
              <p style="color:#ffffff;font-size:22px;font-weight:900;margin:0;">TBC</p>
              <p style="color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:4px 0 0;">Customs &amp; Clearance</p>
            </td>
          </tr>

          <!-- Alert banner -->
          <tr>
            <td style="background:#dc2626;padding:16px 36px;">
              <p style="color:#ffffff;font-size:18px;font-weight:900;margin:0;">⚠️ Action Required — Import VAT Due</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="color:#07152f;font-size:16px;margin:0 0 16px;">Dear <strong>${data.receiverName}</strong>,</p>

              <p style="color:#10213f;font-size:15px;line-height:1.7;margin:0 0 24px;">
                We are writing to inform you that your parcel has been held at our customs facility
                and is unable to proceed to delivery until the outstanding import VAT charge has been settled.
              </p>

              <!-- Parcel details box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="color:#07152f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">Parcel Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#334967;font-size:13px;font-weight:700;padding:5px 0;width:45%;">Tracking Reference</td>
                        <td style="color:#07152f;font-family:monospace;font-size:14px;font-weight:700;padding:5px 0;">${data.trackingNumber}</td>
                      </tr>
                      <tr>
                        <td style="color:#334967;font-size:13px;font-weight:700;padding:5px 0;">Sender</td>
                        <td style="color:#07152f;font-size:14px;padding:5px 0;">${data.senderName}</td>
                      </tr>
                      <tr>
                        <td style="color:#334967;font-size:13px;font-weight:700;padding:5px 0;">Amount Due</td>
                        <td style="color:#dc2626;font-size:18px;font-weight:900;padding:5px 0;">${amount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#10213f;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Under UK customs regulations, import VAT is applicable on goods entering the country.
                This charge must be paid before your parcel can be released for final delivery.
              </p>

              <!-- How to pay -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 10px;">⏰ How to Pay</p>
                    <p style="color:#78350f;font-size:14px;line-height:1.7;margin:0 0 10px;">
                      Please make payment within <strong>48 hours</strong> of receiving this notice.
                      Failure to pay within this timeframe may result in your parcel being held,
                      returned, or disposed of in accordance with HMRC customs policy.
                    </p>
                    <p style="color:#78350f;font-size:14px;line-height:1.7;margin:0;">
                      To arrange payment, please contact the sender <strong>${data.senderName}</strong> directly,
                      quoting your tracking reference <strong>${data.trackingNumber}</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Track parcel button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${trackingLink}"
                       style="display:inline-block;background:#0047bb;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      View Parcel Status →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#10213f;font-size:14px;line-height:1.7;margin:0 0 8px;">
                Once your payment has been received and confirmed, your parcel will be released
                and delivered within <strong>1–2 working days</strong>.
              </p>
              <p style="color:#50627f;font-size:14px;margin:0;">We apologise for any inconvenience this may cause.</p>

              <br/>
              <p style="color:#07152f;font-size:14px;margin:0;">Yours sincerely,</p>
              <p style="color:#07152f;font-size:14px;font-weight:700;margin:4px 0 2px;">TBC Customs &amp; Clearance Team</p>
              <p style="color:#50627f;font-size:13px;margin:0;">TBC Courier Service</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;background:#f8faff;border-top:1px solid #e2e8f0;">
              <p style="color:#9bb8ea;font-size:11px;margin:0;text-align:center;">
                This notice was sent regarding parcel <strong>${data.trackingNumber}</strong>.
                Reference your tracking number in all correspondence with TBC.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendCustomsEmail(
  data: CustomsEmailData,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured." };
  }

  const subject = `Action Required — Import VAT Due on Your Parcel | Ref: ${data.trackingNumber}`;
  const html = generateCustomsHtml(data);

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: FROM,
      to: data.receiverEmail,
      subject,
      html,
    });

    if (result.error) {
      const msg = result.error.message || JSON.stringify(result.error);
      return { success: false, error: msg };
    }

    return { success: true, emailId: result.data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error.",
    };
  }
}
