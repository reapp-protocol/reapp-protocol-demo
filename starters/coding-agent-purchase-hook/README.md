# Coding Agent Purchase Hook

The shared live consumer verifies the fixed price, settles once, retries the paid request once, and verifies the returned patch hash; an offline hook vector rejects a repeated 402 in the settled state.

This self-contained REAPP starter protects `GET /artifacts/:issueId/patch` with a request-bound v2 payment on Stellar testnet. The MandateRegistry contract is the spending authority; the SDK and this application are untrusted clients of that contract.

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

- Paid resource: `GET /artifacts/:issueId/patch`
- Price policy: exact decimal amounts declared by the scenario
- Negative path: `repeated-payment-challenge` — The offline hook transition rejects a repeated 402 in the settled state instead of initiating another payment.
- Fixtures: Two issue identifiers with deterministic patch artifacts and computed SHA-256 values.

Serve a patch only for the allowlisted fixture host, verify its hash after delivery, and return atomic-write metadata without writing files; the repeated-402 hook check is an offline state-transition vector.

### Capabilities

- `verified-bound-purchase`
- `price-inspection`
- `durable-recovery`
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

Catalog identity: `coding-agent-purchase-hook` · fixture policy: `deterministic-and-clearly-labeled`.
