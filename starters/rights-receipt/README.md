# Rights Receipt

Purchase an exact asset-license version and receive content plus a receipt containing content and terms hashes and the settlement transaction hash.

This self-contained REAPP starter protects `GET /licenses/:assetId/:licenseVersion` with a request-bound v2 payment on Stellar testnet. The MandateRegistry contract is the spending authority; the SDK and this application are untrusted clients of that contract.

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

- Paid resource: `GET /licenses/:assetId/:licenseVersion`
- Price policy: exact decimal amounts declared by the scenario
- Negative path: `license-version-rebinding` — Payment for another asset or license version cannot unlock the requested content.
- Fixtures: Bundled text and CSV data assets with stable hashes and clearly labeled sample license terms.

Select text or data fixtures by asset ID and license version, hash the content and terms, record the settlement transaction hash, and verify the asset, version, content, and terms.

### Capabilities

- `request-binding`
- `license-versioning`
- `explorer-evidence`
- `independent-verification`

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

Catalog identity: `rights-receipt` · fixture policy: `deterministic-and-clearly-labeled`.
