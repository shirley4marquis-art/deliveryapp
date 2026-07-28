# mroneconnect.shop checkout integration

Send this webhook from server-side checkout code immediately after valid customer
and delivery details are accepted. Payment completion is not required.

## Endpoint

`POST https://royalruns.co.uk/api/integrations/mroneconnect/checkout`

## JSON body

```json
{
  "event": "checkout.details_submitted",
  "orderId": "checkout_7f78b9d4",
  "orderText": "NEW ORDER - 1:1 CONNECT\n\nCustomer:\nName: Test Customer\nEmail: customer@example.com\nPhone: 07000000000\nCountry: UK\n\nItems:\n\n1. Product: Test Product\n   Variant/Colour: Blue\n   Quantity: 1\n   Unit Price: £200\n   Line Total: £200\n\nDelivery:\nCarrier: Royal Mail\nAddress / Locker: 31 Example Road London E6 1AN\n\nBilling:\nAddress: 31 Example Road London E6 1AN\n\nOrder Total: £200\n\nNotes: None"
}
```

`orderId` must be a stable unique checkout ID. Retrying the same ID returns the
existing shipment instead of creating a duplicate.

## Signature

Create a Unix timestamp in seconds and sign the exact raw JSON body:

```text
HMAC_SHA256(MRONECONNECT_WEBHOOK_SECRET, timestamp + "." + rawJsonBody)
```

Send:

```text
Content-Type: application/json
X-Mrone-Timestamp: 1785200000
X-Mrone-Signature: sha256=<lowercase hexadecimal digest>
```

The secret must stay in server-side code. Do not place it in browser JavaScript.

## Required Royal Runs environment variables

```text
SUPABASE_SERVICE_ROLE_KEY
MRONECONNECT_WEBHOOK_SECRET
```

The endpoint also uses the existing `VITE_SUPABASE_URL` and `SITE_URL` values.
