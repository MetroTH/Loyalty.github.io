# Integration Guide — Webhooks & Partner REST API

Loyalink connects to external platforms through **inbound webhooks**, **outbound
webhooks**, and a **partner REST API**.

Base URL: `https://<project-ref>.functions.supabase.co`

## Inbound webhook — `POST /webhook-inbound`

External systems (e.g. a POS) push events here to earn points.

Headers:
```
Content-Type: application/json
X-Loyalink-Signature: hex(HMAC-SHA256(body, WEBHOOK_INBOUND_SECRET))
X-Loyalink-Tenant: <tenant-slug>
```

Body example (purchase → earn):
```json
{
  "type": "purchase",
  "member": { "phone": "+66812345678" },
  "amount": 450.0,
  "currency": "THB",
  "reference": "POS-INV-1001"
}
```

The function verifies the HMAC signature, records the event, and runs the point
engine against `earn_rules`.

## Outbound webhook

Register endpoints in `webhook_endpoints` (admin UI). Loyalink dispatches signed
events (`member.created`, `points.earned`, `reward.redeemed`, ...) to each
subscribed URL with retry.

## Partner REST API — `/partner-api/*`

Authenticated with an API key (managed in the admin back-office).

```
Authorization: Bearer lk_live_xxxxxxxxxxxxxxxx
```

| Method | Path | Description |
|---|---|---|
| GET | `/partner-api/members/:phone` | Look up a member + balance |
| POST | `/partner-api/points/earn` | Grant points (rule or fixed) |
| POST | `/partner-api/points/redeem` | Burn points / issue voucher |
| GET | `/partner-api/rewards` | List active rewards |

Each key has a **scope** and a **rate limit** (requests/minute). Exceeding the
limit returns `429 Too Many Requests`.

## Adapters (pluggable)

`supabase/functions/_shared/adapters` defines a common interface for external
platforms (LINE OA, payment, e‑commerce, POS). MVP ships **mock** adapters;
real connectors slot in without changing the core.
