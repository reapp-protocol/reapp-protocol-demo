# Paid Tool Gateway

Publish free schema-described tool discovery while charging for selected tool results through a bounded HTTP integration.

This self-contained REAPP starter protects `GET /tools/:toolId/results/:fixtureId` with a request-bound v2 payment on Stellar testnet. The MandateRegistry contract is the spending authority; the SDK and this application are untrusted clients of that contract.

## Start

You need Node.js 20 or newer. You do not need a wallet or a GitHub repo.

### If you used Copy setup command

The setup command on [reapp.live/hackathon](https://reapp.live/hackathon) already downloaded this starter, extracted it into your empty folder, and ran `npm ci`. In the same VS Code terminal, run:

```bash
npm run demo
```

### If you downloaded the ZIP manually

Extract the ZIP, open the extracted folder in VS Code, select **Terminal → New Terminal**, then run:

```bash
npm ci
npm run demo
```

The demo creates disposable testnet accounts, starts the local consumer and fulfillment service, and runs the scenario. It never requests a wallet or mainnet secret.

## What success looks like

The terminal shows:

1. The local fulfillment server starting.
2. Accepted Stellar testnet payment evidence with explorer transaction hashes.
3. The protected result delivered to the consumer.
4. The named negative or recovery check reaching its documented outcome.

## Scenario

- Paid resource: `GET /tools/:toolId/results/:fixtureId`
- Price policy: exact decimal amounts declared by the scenario
- Negative path: `tool-price-ceiling` — The offline consumer-policy check rejects a quoted tool price above its declared ceiling before any payment attempt.
- Fixtures: Two deterministic supply-risk and document-classification tools with declared fixtureId schemas and fixed outputs.

Publish free discovery metadata for two fixture tools, require a known fixture identifier, enforce the price ceiling in an offline consumer-policy check, and return result provenance from the fixed live purchase.

### Capabilities

- `price-inspection`
- `verified-bound-purchase`
- `fixture-selection`
- `request-binding`

## Make it yours

Start with these three files:

| File | What to change |
|---|---|
| `scenario/scenario.mjs` | Your product's rules, sample data, delivery checks, and rejection check. |
| `src/consumer.mjs` | How your app requests and pays for the protected result. |
| `src/fulfillment.mjs` | What your paid Express endpoint returns. |

The shared payment and recovery code lives in `shared/`. Leave it unchanged until your project needs advanced customization.

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

Catalog identity: `paid-tool-gateway` · fixture policy: `deterministic-and-clearly-labeled`.
