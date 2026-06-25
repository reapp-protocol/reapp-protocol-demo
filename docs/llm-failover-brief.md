# Orchestration engine: how it works, and why we don't need OpenRouter

## How the orchestration engine works

The research agent never calls an LLM SDK directly. It calls one function, the
orchestration engine (`lib/llm.ts`), and asks for a completion. The agent code
has zero provider knowledge.

The engine holds an ordered list of providers. Each provider runs two model
tiers: a main model for the agent's reasoning loop, and a faster sub model for
the per-source findings calls. Both tiers fail over together.

1. **Primary**: Anthropic. Main: Claude Opus 4.8. Sub: Claude Sonnet 4.6.
2. **Backup**: OpenAI. Main and sub: ChatGPT GPT-5.5.

On each call it sends the request to the primary. If the primary fails in a way
worth retrying (out of credit/quota, rate limited / 429, a 5xx, or a network
error), the engine transparently re-sends the same request to the backup. A real
bad request (400) is not retried, because the backup would reject it too.

The engine returns the answer plus which model served it. Every turn reports that
model, shown live in the UI (the ORCHESTRATOR chip and LLM engine bar) and the
logs. If both providers are down, the agent still returns a real report from the
sources it already bought on chain. Provider order and models are env config, so
swapping providers is a config change, not a code change.

## Why we don't need OpenRouter

- **Direct calls.** Straight to Anthropic and OpenAI via official SDKs. No third
  party in a path that also settles payments: no added latency, no extra outage
  surface, no prompt data through a middleman.
- **No markup, no extra balance.** We spend the providers' own credits on
  accounts we control, not a funded OpenRouter balance with a per-call fee.
- **Day-one models + full features**, with no wait for a router to support them.
- **We own the policy.** ~250 auditable lines, not a black box.
- **One less key/account to secure.**

Bottom line: OpenRouter solves "many providers behind one key." We have two,
called directly, with our own failover. A router would add cost, latency, and a
dependency for no benefit.

## One myth to kill: the "5 hour window"

That's a consumer chat-subscription limit, not an API-key one. We use
pay-as-you-go API keys, which have no 5-hour window. The only limits are credit
balance and per-minute rate limits, and the failover covers both.

## Configuration

```
ANTHROPIC_API_KEY=hidden
OPENAI_API_KEY=hidden
LLM_PRIMARY=anthropic
ANTHROPIC_MODEL=claude-opus-4-8
ANTHROPIC_MODEL_SUB=claude-sonnet-4-6
OPENAI_MODEL=gpt-5.5
OPENAI_MODEL_SUB=gpt-5.5
```
