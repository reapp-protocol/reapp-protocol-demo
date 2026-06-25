# reapp-protocol-live

A **Next.js** demo of [`@reapp-sdk/core`](https://www.npmjs.com/package/@reapp-sdk/core):
an AI agent makes **pay-per-use content payments** that are enforced **on-chain**
by the REAPP **MandateRegistry** Soroban contract on Stellar testnet.

Real payments move, and the contract **blocks the agent** the moment it overspends
or after you revoke.

## Two demos

**Video paywall** (`/video`) — the agent pays 1 XLM per video unlock under a 3 XLM
mandate; after 3 the contract blocks the 4th, and revoke kills it instantly.

1. **Create + fund** a throwaway testnet wallet (user, agent, creator) — one click, friendbot-funded.
2. **Authorize** the agent: a 3 XLM mandate is registered on-chain and the contract gets a SEP-41 allowance (user-signed).
3. **Unlock content**: the agent pays 1 XLM per item via `execute_payment` — real, agent-signed, viewable on the explorer.
4. **The cap holds**: after 3 unlocks the contract rejects the 4th (`BudgetExceeded`); revoke the mandate and the next payment is rejected (`MandateRevoked`).

**Research agent** (`/research`) — an **AI agent** answers your
question by autonomously buying paid data sources (1 XLM each). It decides what
to buy; the contract enforces the 3 XLM budget and **blocks** purchases past it, so
the agent can't overspend even when it wants more. It then synthesizes an answer from
what it could afford. The run streams live (each on-chain purchase, each block).

The SDK runs **server-side** in Next.js API routes (Node) — the exact published
package. The contract enforces the budget on-chain, so the SDK can't exceed the mandate.

## Run

```
npm install
npm run dev
```

Open http://localhost:3000. Everything is on Stellar **testnet** with ephemeral
keys — never use mainnet keys here.

The **research agent** demo additionally needs an LLM API key. It supports two
providers and fails over between them, so a run keeps working if one runs out of
credit or gets rate-limited. Set one or both in `.env.local` (gitignored), and in
your host's environment variables for the deployed site:

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

Without any key, the video demo still works; the research page shows a clear notice.

## How it works

- `lib/reapp-server.ts` wraps `@reapp-sdk/core` (`createIntentMandate`, `registerMandate`, `approveBudget`, `agent().pay()`, `revokeMandate`).
- `app/api/reapp/route.ts` — Node API handler for wallet / mandate / payment / revoke (shared by both demos).
- `lib/research-agent.ts` — the LLM agentic loop: a `purchase_source` tool whose every call is a real on-chain `execute_payment`.
- `app/api/research/route.ts` — streams the research run as newline-delimited JSON.
- `app/page.tsx` (docs) / `app/video/page.tsx` / `app/research/page.tsx` — the UIs.

Contract + protocol: https://github.com/reapp-protocol/reapp-protocol
