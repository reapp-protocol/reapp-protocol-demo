# reapp-protocol-examples

A slick **Next.js** demo of [`@reapp-sdk/core`](https://www.npmjs.com/package/@reapp-sdk/core):
an AI agent makes **pay-per-use content payments** that are enforced **on-chain**
by the REAPP **MandateRegistry** Soroban contract on Stellar testnet.

It's the "this isn't just code — it does something" proof: real payments move,
and the contract **blocks the agent** the moment it overspends or after you revoke.

## What it shows

1. **Create + fund** a throwaway testnet wallet (user, agent, creator) — one click, friendbot-funded.
2. **Authorize** the agent: a 3 XLM mandate is registered on-chain and the contract gets a SEP-41 allowance (user-signed).
3. **Unlock content**: the agent pays 1 XLM per item via `execute_payment` — real, agent-signed, viewable on the explorer.
4. **The leash holds**: after 3 unlocks the contract rejects the 4th (`BudgetExceeded`); revoke the mandate and the next payment is rejected (`MandateRevoked`).

The SDK runs **server-side** in a Next.js API route (Node) — the exact published
package, no mocks. The contract is the source of truth; the SDK is untrusted.

## Run

```
npm install
npm run dev
```

Open http://localhost:3000. Everything is on Stellar **testnet** with ephemeral
keys — never use mainnet keys here.

## How it works

- `lib/reapp-server.ts` wraps `@reapp-sdk/core` (`createIntentMandate`, `registerMandate`, `approveBudget`, `agent().pay()`, `revokeMandate`).
- `app/api/reapp/route.ts` is the single Node API handler.
- `app/page.tsx` is the UI.

Contract + protocol: https://github.com/reapp-protocol/reapp-protocol
