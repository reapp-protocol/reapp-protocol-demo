# Procurement Guard

A purchasing agent evaluates approved vendor quote fixtures offline and buys one explicitly selected allowlisted quote pack.

This self-contained REAPP starter protects `GET /vendors/:vendorId/quote-packs/:requestId` with a request-bound v2 payment on Stellar testnet. The MandateRegistry contract is the spending authority; the SDK and this application are untrusted clients of that contract.

## Start

You need Node.js 20 or newer. From this extracted folder:

```bash
npm ci
npm run check
npm run demo
```

The offline gate check runs deterministic business, rejection, delivery-tamper, and free-route vectors. The live demo creates disposable testnet accounts, starts this kit's local Express fulfillment server, registers a scoped mandate, pays with the consumer, records explorer evidence, and runs the named negative check. It never requests a wallet or mainnet secret.
## Scenario

- Paid resource: `GET /vendors/:vendorId/quote-packs/:requestId`
- Price policy: exact decimal amounts declared by the scenario
- Negative path: `unauthorized-vendor` — A cheaper vendor outside the configured allowlist remains ineligible and cannot be selected for purchase.
- Fixtures: Three stable quote fixtures with vendor IDs, lead times, quote ages, item rows, and one checked approved-vendor selection.

Offline vectors rank approved fixture quotes by cost, lead time, and freshness; the live route serves one explicitly selected allowlisted quote pack.

### Capabilities

- `merchant-scope`
- `vendor-allowlist`
- `quote-freshness`
- `explorer-evidence`

## Files to edit

| File | Purpose |
|---|---|
| `scenario/scenario.mjs` | Distinct deterministic business rules, fixtures, delivery checks, and rejection check. |
| `src/consumer.mjs` | Runs the disposable consumer and calls the paid route through the shared request-bound runtime. |
| `src/fulfillment.mjs` | Runs this scenario as a local 402-gated Express service. |
| `shared/` | Copied, self-contained payment, storage, recovery, and evidence runtime. |
| `src/check.mjs` | Executes this scenario's offline vectors. |
| `src/reset.mjs` | Archives resolved local state and refuses unsafe cleanup. |

## Run fulfillment separately

The one-command demo starts both sides automatically. To inspect or modify the server independently:

```bash
cp .env.example .env
# Put a funded Stellar testnet public G-address in REAPP_MERCHANT.
npm run fulfillment
```

Keep the challenge secret private and stable. The reference file store is for one local Node process; multi-process deployments need one shared linearizable store implementing the same interface.

## Safety and recovery

- Paid work is GET-only and bound to the exact origin, method, resource, merchant, asset, amount, registry, and short-lived challenge.
- Delivery evidence is committed before the client acknowledges and clears a settlement receipt.
- Exact same-proof replay returns byte-identical recovery; an old proof on a new resource is rejected, and a freshly rebound proof reusing an old transaction conflicts.
- State under `.reapp/` is private and ignored by Git. Run `npm run reset` only after all payment and fulfillment evidence is resolved.

Catalog identity: `procurement-guard` · fixture policy: `deterministic-and-clearly-labeled`.
