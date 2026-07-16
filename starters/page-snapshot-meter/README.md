# Page Snapshot Meter

An agent buys a normalized page snapshot containing metadata, links, word count, and a content hash.

This self-contained REAPP starter protects `GET /snapshots/:pageId` with a request-bound v2 payment on Stellar testnet. The MandateRegistry contract is the spending authority; the SDK and this application are untrusted clients of that contract.

## Start

You need Node.js 20 or newer. From this extracted folder:

```bash
npm ci
npm run check
npm run demo
```

The offline gate check runs deterministic business, rejection, delivery-tamper, and free-route vectors. The live demo creates disposable testnet accounts, starts this kit's local Express fulfillment server, registers a scoped mandate, pays with the consumer, records explorer evidence, and runs the named negative check. It never requests a wallet or mainnet secret.
## Scenario

- Paid resource: `GET /snapshots/:pageId`
- Price policy: exact decimal amounts declared by the scenario
- Negative path: `snapshot-resource-rebinding` — Payment for one page cannot unlock a different page because the proof is bound to the exact requested resource.
- Fixtures: Two bundled HTML fixture pages and one deterministic normalization check covering title, links, and word count; the live result computes a content hash, and the kit makes no browser-rendering claim.

Reject fixture HTML containing script, style, or iframe elements, extract text metadata, and hash the normalized result; this is not a general HTML sanitizer.

### Capabilities

- `verified-bound-purchase`
- `request-binding`
- `response-integrity`
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

Catalog identity: `page-snapshot-meter` · fixture policy: `deterministic-and-clearly-labeled`.
