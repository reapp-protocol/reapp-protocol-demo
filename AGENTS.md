# AGENTS.md

Project guidance for agents working in `reapp-protocol-live`.

## What this is

A Next.js 15 (App Router) demo of [`@reapp-sdk/core`](https://www.npmjs.com/package/@reapp-sdk/core).
An AI agent makes pay-per-use payments that are enforced on-chain by the REAPP
MandateRegistry Soroban contract on Stellar testnet. The SDK runs server-side in
Next.js API routes — the contract enforces the budget on-chain, so the SDK can't exceed the mandate.

## Run

```
npm install
npm run dev        # http://localhost:3000
```

Everything runs on Stellar **testnet** with ephemeral keys. The research agent
additionally needs an LLM API key in `.env.local` (gitignored):
`ANTHROPIC_API_KEY=sk-ant-...`. Without it the video demo still works and the
research page shows a notice.

## Routes

- `/` — **Docs** (landing page). Source: `app/page.tsx`.
- `/research` — research agent demo. Source: `app/research/page.tsx`.
- `/video` — video paywall demo. Source: `app/video/page.tsx`.

Nav order is defined in `components/Nav.tsx` (`links` array): Docs · Research · Video.

## Key files

- `lib/reapp-server.ts` — wraps `@reapp-sdk/core` (mandate / approve / pay / revoke).
- `app/api/reapp/route.ts` — Node API handler for wallet / mandate / payment / revoke.
- `lib/research-agent.ts` — the LLM agentic loop; a `purchase_source` tool whose every call is a real on-chain `execute_payment`.
- `app/api/research/route.ts` — streams the research run as newline-delimited JSON.

## Conventions

- **No "Claude"/Anthropic branding in user-facing surfaces.** UI copy, README prose,
  comments, and log/banner strings refer to the model generically — *agent*, *AI*, or
  *LLM*. The only allowed references are functional and required to run: the
  `@anthropic-ai/sdk` import, the `model:` strings passed to `client.messages.create(...)`
  in `lib/research-agent.ts`, and the `ANTHROPIC_API_KEY` env var name.
- **No marketing hype / AI-slop copy.** Avoid empty intensifiers ("NO MOCKS",
  "*-POWERED", "slick", "Premium", emphatic "Real …"). Keep concrete, accurate
  technical statements (the on-chain budget cap, contract-enforced limits, revocable mandate).
- Use relative paths in symlinks and imports — never absolute.
