# REAPP hackathon starter

Go from an empty folder to a verified `402 → contract payment → 200` flow on
Stellar testnet. The hosted merchant appears beside your terminal at
[`reapp.live/hackathon`](https://reapp.live/hackathon), so you can follow each
challenge, payment, delivery, and contract rejection without building a server
first.

This starter uses disposable testnet accounts. It does not ask for a wallet or
store a mainnet secret.

## Start in under five minutes

You need Node.js 20 or newer.

1. Open [`reapp.live/hackathon`](https://reapp.live/hackathon) and create a
   testnet workspace.
2. Open an empty folder in VS Code and run:

   ```bash
   npx degit reapp-protocol/reapp-protocol-demo/starters/hackathon .
   npm ci
   ```

3. Copy the generated command from the page. It has this shape:

   ```bash
   npm run demo -- --endpoint="https://reapp.live/api/express/WORKSPACE_ID/source" --merchant="G..."
   ```

Keep the `/hackathon` page open while the command runs. The terminal and page
show the same live testnet flow:

1. Fresh user and agent accounts are created and funded by Friendbot.
2. The user registers a 3 XLM mandate scoped to the displayed merchant.
3. An unpaid request returns a request-bound `402 Payment Required` challenge.
4. `agent.fetch()` pays through MandateRegistry and receives HTTP 200.
5. Market, academic, and news resources are delivered for 1 XLM each.
6. The patents request attempts a fourth payment; the contract rejects it because
   the mandate budget is exhausted.
7. The starter reports the public mandate id to the hosted page. The server reads
   MandateRegistry and records the rejection only after the chain proves exactly
   3 XLM was consumed.

Every successful payment prints a Stellar Expert transaction link. Durable run
evidence is written to `.reapp/results.json` with owner-only file permissions.

## What to open in VS Code

| File | Purpose |
|---|---|
| `src/consumer.mjs` | Creates the mandate and performs each paid request with `agent.fetch()`. |
| `src/fulfillment.mjs` | Runnable Express merchant using request-bound challenges and independent on-chain verification. |
| `src/storage.mjs` | Durable, atomic receipt, result, and fulfillment redemption storage. |
| `src/reset.mjs` | Archives safe local state and refuses to discard unresolved payment evidence. |
| `.env.example` | Equivalent environment-variable setup for repeat use. |

The consumer does not decide whether spending is allowed. Every payment reaches
the contract's `execute_payment` path; merchant scope, expiry, revocation,
sequence, and remaining budget are enforced on-chain.

## Environment-variable alternative

Copy the example file, then replace only the endpoint and merchant shown by the
hosted workspace:

```bash
cp .env.example .env
npm run demo
```

Command-line flags take precedence over `.env`, so the generated `/hackathon`
command is the simplest first run.

## Failure and recovery behavior

Paid HTTP delivery has two commits: settlement on Stellar and acceptance by your
application. The SDK saves a bound settlement receipt before broadcast. This
starter records the complete delivered result durably before acknowledging and
clearing that receipt.

If settlement or delivery becomes uncertain, the run stops. A later run sees the
pending receipt in `.reapp/pending-receipts.json` and refuses to create another
payment. Do not delete that file or retry with a new payment; inspect the printed
transaction hash and recover the exact receipt.

After a completed run, archive its state with:

```bash
npm run reset
```

The reset command clears only receipts whose delivery already exists in the
durable results file. It refuses to continue when any unresolved evidence
remains, and moves safe state into `.reapp-archive/` instead of deleting it.

## Run your own fulfillment server

The default demo uses the hosted Express merchant. Advanced users can run and
edit the same middleware pattern locally in `src/fulfillment.mjs`.

Create a funded public testnet recipient, choose a stable private challenge
secret of at least 32 bytes, then run:

```bash
npm run fulfillment -- \
  --merchant="G_FUNDED_TESTNET_ADDRESS" \
  --origin="http://127.0.0.1:4021" \
  --secret="$(openssl rand -hex 32)"
```

In a second terminal:

```bash
npm run demo -- \
  --endpoint="http://127.0.0.1:4021/source" \
  --merchant="G_FUNDED_TESTNET_ADDRESS"
```

The fulfillment example:

- issues a short-lived challenge bound to the exact origin, method, and resource;
- independently verifies the settlement transaction and mandate on Stellar;
- stores proof claims and exact JSON response bytes atomically before delivery;
- refuses an unknown resource or invalid proof without serving protected data.

Its file store is appropriate for this single Node process. A multi-process or
multi-host service must replace it with one shared, linearizable database that
implements the same redemption-store methods.

## Gate check

Run the local package and syntax gate check without contacting testnet:

```bash
npm run check
```

The live flow is the final check because it depends on Friendbot, Stellar testnet,
and the temporary workspace created at `/hackathon`.
