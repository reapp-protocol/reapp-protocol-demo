# Page Snapshot Meter

An agent buys a normalized page snapshot containing metadata, links, word count, and a content hash.

This self-contained REAPP starter protects `GET /snapshots/:pageId` with a request-bound v2 payment on Stellar testnet. The MandateRegistry contract is the spending authority; the SDK and this application are untrusted clients of that contract.

## Start

You need Node.js 20 or newer. You do not need a wallet or a GitHub repo.

1. Open this folder in VS Code.
2. Select **Terminal → New Terminal**.
3. Paste this line and press **Enter**:

```bash
npm ci && npm run check && npm run demo
```

That one line installs the packages, checks the starter, and runs the live testnet demo. It never requests a wallet or mainnet secret.
## What success looks like

The terminal prints:

1. The offline gate check passing.
2. The local fulfillment server starting.
3. Paid testnet requests completing with Stellar explorer links.
4. The named rejection check being blocked as expected.

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

Catalog identity: `page-snapshot-meter` · fixture policy: `deterministic-and-clearly-labeled`.
