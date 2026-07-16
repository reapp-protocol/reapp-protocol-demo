# Research Source Scout

A research agent buys ranked market, academic, and news sources, then stops when its mandate cannot fund a fourth source.

This self-contained REAPP starter protects `GET /source/:sourceId` with a request-bound v2 payment on Stellar testnet. The MandateRegistry contract is the spending authority; the SDK and this application are untrusted clients of that contract.

## Start

You need Node.js 20 or newer. From this extracted folder:

```bash
npm ci
npm run check
npm run demo
```

The offline gate check runs deterministic business, rejection, delivery-tamper, and free-route vectors. The live demo creates disposable testnet accounts, starts this kit's local Express fulfillment server, registers a scoped mandate, pays with the consumer, records explorer evidence, and runs the named negative check. It never requests a wallet or mainnet secret.
## Hosted /hackathon companion

Create a workspace at [reapp.live/hackathon](https://reapp.live/hackathon), then run the exact command it displays:

```bash
npm run hosted -- --endpoint="https://reapp.live/api/express/WORKSPACE/source" --merchant="G..."
```

This keeps the merchant on the hosted Express service while the consumer, disposable signers, mandate, contract settlement, and durable evidence stay in your local extracted folder. The terminal and browser companion show the same workspace flow.

## Scenario

- Paid resource: `GET /source/:sourceId`
- Price policy: exact decimal amounts declared by the scenario
- Negative path: `budget-exhausted` — The fourth purchase is rejected on-chain because its exact amount exceeds the mandate's remaining authority.
- Fixtures: Four stable JSON sources with fixed identifiers, prices, relevance scores, and per-source provenance.

Rank sources by relevance, purchase the three planned sources sequentially, retain per-source provenance and evidence, and record the rejected fourth source without creating a paid delivery.

### Capabilities

- `verified-bound-purchase`
- `cumulative-budget`
- `request-binding`
- `independent-verification`
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

Catalog identity: `research-source-scout` · fixture policy: `deterministic-and-clearly-labeled`.
