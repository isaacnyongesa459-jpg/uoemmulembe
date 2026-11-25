# Future M-Pesa Daraja integration

## Current state

The donation page is a presentation and validation surface only. `data/donation-client-config.json` deliberately sets `enabled` to `false` and `apiEndpoint` to an empty string. The current static GitHub Pages deployment has no payment backend: selecting Donate displays an inactive/no-transaction message, sends no request and cannot report a real pending, successful or failed transaction. Never claim otherwise. The site never requests or stores an M-Pesa PIN.

## Browser-to-backend contract (version 1)

After a secure hosted backend has been implemented, reviewed and tested, configure the browser-safe file `data/donation-client-config.json` with `enabled: true` and a same-origin HTTPS API endpoint such as `./api/donations/stk-push`. Under the current `/uoemmulembe/` Pages subpath, this resolves within the project path as `/uoemmulembe/api/donations/stk-push`, rather than at the domain root. The service worker fetches this file network-first and uses its last cached copy offline. Keep that endpoint on the project-controlled backend. Never put Daraja Consumer Key, Consumer Secret, Shortcode passkey, access token, signing secret or other credential in this file, HTML, JavaScript, GitHub Pages environment or repository.

GitHub Pages serves static files and cannot host this API. Before activation, deploy a project-controlled HTTPS backend behind a same-origin host or reverse proxy that routes the configured project-path endpoint to that backend. The current client intentionally rejects cross-origin endpoints; using a separate API origin would require a deliberate client/security design change, including narrowly configured CORS and origin protections, and must not be enabled by simply inserting an external URL.

The client may POST JSON to the configured endpoint:

```json
{
  "contractVersion": 1,
  "amountKes": 500,
  "phoneNumber": "+254712345678",
  "currency": "KES",
  "purpose": "MULEMBE_UNION_DONATION"
}
```

The server validates amount boundaries and Kenyan phone normalization, applies abuse controls and idempotency, obtains Daraja credentials server-side, initiates STK Push and returns an opaque server-generated transaction reference with an initial `pending` status. The browser may display the statuses `pending`, `successful` or `failed` only from a validated backend response; network errors are errors, never success. Any success must be based on a verified provider callback and reconciled server record—not the browser redirect, a button click, or an untrusted client response.

## Backend requirements before activation

- Host a secure HTTPS backend with server-only Daraja credentials, key rotation and least-privilege access.
- Validate and normalize KSh integer amounts and Kenyan phone numbers; apply rate limits, CSRF/origin protections appropriate to the deployment, request idempotency and audit logging that avoids unnecessary personal data.
- Validate Daraja callback signatures/expected source according to current Safaricom documentation; reject replay/tampering, persist callback/result state durably, reconcile asynchronous outcomes and make callback processing idempotent.
- Protect transaction references and status endpoints; do not expose other donors’ data. Never collect a PIN or store it.
- Complete sandbox tests for pending, callback success, callback failure, timeout, duplicate/replayed callback, invalid input and network/backend errors. Then perform a separately authorized live test and independent operational review before declaring payments available.
- Review applicable Safaricom Daraja terms, privacy/data-protection obligations, receipts/refunds and Union financial controls before collecting contributions.

No credentials, transactions, callbacks, payment accounts or successful-payment claims exist in this static implementation.
