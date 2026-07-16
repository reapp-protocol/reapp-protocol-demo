# reapp-protocol-live

A **Next.js** demo of [`@reapp-sdk/core`](https://www.npmjs.com/package/@reapp-sdk/core):
an AI agent makes **pay-per-use content payments** that are enforced **on-chain**
by the REAPP **MandateRegistry** Soroban contract on Stellar testnet.

Real payments move, and the contract **blocks the agent** the moment it overspends
or after you revoke.

## Live protocol surfaces

The site is both the implementation guide and a set of inspectable agentic payments demonstrations:

- **Docs** (`/`) — published SDK installation, consumer flow, Express verification, testnet run, and safety boundary.
- **CLI** (`/cli`) — initialize actors, create mandates, pay, and inspect rejection paths from the terminal.
- **Express** (`/express`) — payment-required API flow with settlement and one-time redemption verification.
- **Hackathon** (`/hackathon`) — blank-folder starter connected to hosted Express fulfillment, with live local-consumer evidence.
- **AP2** (`/ap2`) — intent and transaction mandate binding, canonical signatures, scope, expiry, and replay checks.
- **Composite mandates** (`/composites`) — multiple buyer agents coordinate an atomic group purchase.
- **Research agent** (`/research`) — paid-source selection constrained by an on-chain budget.
- **Video paywall** (`/video`, direct link) — three permitted unlocks followed by a contract-rejected fourth payment.

Machine-readable maps are published at `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, and `/robots.txt`.

REAPP is the live implementation companion to [REAPP NETWORK](https://reapp.network), the source-linked research and architecture field guide for agentic payments. The two sites share ownership and link to each other transparently.

## Hackathon starter library

`/hackathon` publishes 20 self-contained Stellar testnet starters. Each kit includes editable consumer and Express fulfillment source, deterministic fixtures, exact package versions, one focused rejection path, an offline gate check, and a downloadable archive with a public SHA-256 manifest.

For the guided hosted flow, create a disposable workspace on [`reapp.live/hackathon`](https://reapp.live/hackathon), copy the generated setup command into an empty VS Code folder, and run the displayed consumer command. The terminal and browser companion then show the same `402 → contract payment → 200` sequence, three verified deliveries, the fourth contract rejection, and explorer evidence.

For a fully local consumer-and-fulfillment run:

```bash
curl -fsSLo reapp-hackathon.zip https://reapp.live/starters/v1/hackathon.zip
unzip -q reapp-hackathon.zip
rm reapp-hackathon.zip
npm ci
npm run check
npm run demo
```

The latest clean-room test on 2026-07-16 reached its first verified delivery in 26.1 seconds and completed the three-delivery plus rejection flow in 40.3 seconds. Those measurements are evidence from one run, not a network-speed guarantee; the public target remains under five minutes.

## Demonstration details

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
