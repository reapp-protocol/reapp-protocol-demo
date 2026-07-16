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
additionally needs an LLM API key in `.env.local` (gitignored). It supports two
providers and fails over between them so a run never goes dark if one is out of
credit or rate-limited: set `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` (either
alone works; both enable failover). `LLM_PRIMARY` (default `anthropic`) picks the
primary and `OPENAI_MODEL` / `OPENAI_MODEL_SUB` set the OpenAI model ids. See
`.env.example`. The failover layer lives in `lib/llm.ts`. Without any key the
video demo still works and the research page shows a notice.

## Routes

- `/` — **Docs** (landing page). Source: `app/page.tsx`.
- `/research` — research agent demo (LLM). Source: `app/research/page.tsx`.
- `/video` — video paywall demo. Source: `app/video/page.tsx`.
- `/hackathon` — beginner onboarding: scaffold a clean project, connect it to
  hosted Express fulfillment, and watch local `agent.fetch()` evidence arrive.
  Source: `app/hackathon/page.tsx`.
- `/t2` — **Tranche 2** hub. New T2 work is isolated here so it doesn't confuse the
  Tranche 1 review. Source: `app/t2/page.tsx`.
- `/t2/demo` — live **xterm.js terminal** that runs the real `reapp` CLI on the
  server and streams its output. Source: `app/t2/demo/page.tsx`.
- `/composites` — composite mandates (clearing pools) demo: three buyer agents pool one
  group buy; the contract clears everyone at one uniform price in a single atomic
  transaction. Runs against the T2 composite build of MandateRegistry (a separate
  testnet deployment; id pinned in `lib/composites-client.ts`). Source: `app/composites/page.tsx`.

Nav order is defined in `components/Nav.tsx` (`links` array): Docs · CLI · Express ·
AP2 · Research · Hackathon. The `/video` route remains available by direct link.
T1 pages stay grouped first. Tranche 2 surfaces are UNLISTED (not in the nav, per team
decision — no tranche-era items in the site chrome): `/t2` and `/composites` are reachable
by direct link only; the `/t2` hub links to `/composites`.

## Key files

- `lib/reapp-server.ts` — wraps `@reapp-sdk/core` (mandate / approve / pay / revoke).
- `app/api/reapp/route.ts` — Node API handler for wallet / mandate / payment / revoke.
- `lib/research-agent.ts` — the LLM agentic loop; a `purchase_source` tool whose every call is a real on-chain `execute_payment`.
- `app/api/research/route.ts` — streams the research run as newline-delimited JSON.
- `vendor/reapp-cli.mjs` — self-contained bundle of the reapp CLI (fixed core inlined). See `vendor/README.md` to regenerate.
- `app/api/cli/route.ts` — spawns `vendor/reapp-cli.mjs <args>` per session (cwd + REAPP_HOME) and streams raw stdout/stderr; allow-lists the CLI subcommands.
- `lib/composites-client.ts` — vendored typed client for the T2 composite contract build (regenerate with `stellar contract bindings typescript` in reapp-protocol).
- `lib/composites-server.ts` — the group-buy generator: pool, three buyers, deadline auction, atomic capture; streamed by `app/api/composites/route.ts`.

## Conventions

- **No "Claude"/Anthropic branding in user-facing surfaces.** UI copy, README prose,
  comments, and log/banner strings refer to the model generically — *agent*, *AI*, or
  *LLM*. The only allowed references are functional and required to run: the
  `@anthropic-ai/sdk` import, the `model:` strings passed to `client.messages.create(...)`
  in `lib/research-agent.ts`, and the `ANTHROPIC_API_KEY` env var name.
- **Terminology (hard rule):** never the word "audit" in copy/docs/commits — say "gate check";
  never "Tranche" or "milestone"; no grant-program wording on any user-visible page.
  (The verb "grant" for SEP-41 allowances is fine.) The `/t2` route name stays; its
  user-visible copy says "Developer toolkit · preview".
- **No marketing hype / AI-slop copy.** Avoid empty intensifiers ("NO MOCKS",
  "*-POWERED", "slick", "Premium", emphatic "Real …"). Keep concrete, accurate
  technical statements (the on-chain budget cap, contract-enforced limits, revocable mandate).
- Use relative paths in symlinks and imports — never absolute.
