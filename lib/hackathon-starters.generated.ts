// Generated from starter-kit-src/catalog.json by scripts/starters/generate.mjs.
// Run the generator after changing the catalog.

export const HACKATHON_STARTER_CATALOG = {
  "catalogId": "reapp-hackathon-starters-v1",
  "constraints": {
    "compatibilityClaim": "reapp-bound-v2",
    "fixturePolicy": "deterministic-and-clearly-labeled",
    "network": "stellar-testnet",
    "paidMethod": "GET",
    "proofPolicy": "bound-v2-only",
    "runtime": "local-consumer-and-fulfillment"
  },
  "kits": [
    {
      "businessLogic": "Rank sources by relevance, purchase them sequentially, merge provenance-tagged results, and preserve the locked status of anything the contract rejects.",
      "category": "Data APIs",
      "difficulty": "Beginner",
      "features": [
        "agent-fetch",
        "cumulative-budget",
        "request-binding",
        "replay-defense",
        "explorer-evidence"
      ],
      "fixtures": "Four stable JSON sources with fixed identifiers, prices, relevance scores, and expected merged provenance.",
      "id": "research-source-scout",
      "inspiration": [
        "coinbase-x402",
        "cloudflare-x402",
        "coinbase-agent-winners"
      ],
      "negativePath": {
        "id": "budget-exhausted",
        "outcome": "The fourth purchase is rejected on-chain and an accepted proof cannot unlock another source."
      },
      "paidResource": "GET /source/:sourceId",
      "slug": "hackathon",
      "summary": "A research agent buys ranked market, academic, and news sources, then stops when its mandate cannot fund a fourth source.",
      "title": "Research Source Scout"
    },
    {
      "businessLogic": "Sanitize fixture HTML, canonicalize its structure, extract reviewable metadata, and hash the normalized result for cache-safe delivery.",
      "category": "Content infrastructure",
      "difficulty": "Intermediate",
      "features": [
        "agent-fetch",
        "request-binding",
        "one-time-redemption",
        "explorer-evidence"
      ],
      "fixtures": "Bundled HTML pages and independently checked normalized snapshot JSON; the kit makes no browser-rendering claim.",
      "id": "page-snapshot-meter",
      "inspiration": [
        "cloudflare-x402",
        "cloudflare-http"
      ],
      "negativePath": {
        "id": "snapshot-resource-rebinding",
        "outcome": "Payment for one page cannot unlock another page and malformed fixture HTML fails before settlement."
      },
      "paidResource": "GET /snapshots/:pageId",
      "slug": "page-snapshot-meter",
      "summary": "An agent buys a normalized page snapshot containing metadata, links, readability statistics, and a content hash.",
      "title": "Page Snapshot Meter"
    },
    {
      "businessLogic": "Map only allowlisted upstream routes, strip sensitive headers, enforce an upstream deadline, and attach response provenance without accepting arbitrary target URLs.",
      "category": "Infrastructure",
      "difficulty": "Beginner",
      "features": [
        "merchant-scope",
        "independent-verification",
        "request-binding",
        "explorer-evidence"
      ],
      "fixtures": "A local upstream service with stable inventory, weather, and account-status payloads and explicit route mappings.",
      "id": "api-tollgate",
      "inspiration": [
        "cloudflare-gateway",
        "cloudflare-http"
      ],
      "negativePath": {
        "id": "upstream-not-allowlisted",
        "outcome": "Unknown upstream routes fail before payment and another merchant's mandate cannot unlock the gateway."
      },
      "paidResource": "GET /gateway/:service/:resourceId",
      "slug": "api-tollgate",
      "summary": "Place REAPP in front of an existing read-only API without rewriting the protected backend.",
      "title": "Existing API Tollgate"
    },
    {
      "businessLogic": "Separate free discovery from paid execution, validate declared input schemas, enforce a client price ceiling, and return typed result provenance.",
      "category": "Agent tooling",
      "difficulty": "Intermediate",
      "features": [
        "price-inspection",
        "agent-fetch",
        "cumulative-budget",
        "request-binding"
      ],
      "fixtures": "Deterministic supply-risk, exchange-rate, and document-classification tools with typed inputs and outputs.",
      "id": "paid-tool-gateway",
      "inspiration": [
        "cloudflare-mcp",
        "cloudflare-agents",
        "x402-foundation"
      ],
      "negativePath": {
        "id": "tool-price-ceiling",
        "outcome": "An unknown schema or a price above the consumer ceiling is rejected without attempting payment."
      },
      "paidResource": "GET /tools/:toolId/results/:fixtureId",
      "slug": "paid-tool-gateway",
      "summary": "Publish free typed tool discovery while charging for selected tool results through a bounded HTTP integration.",
      "title": "Paid Tool Gateway"
    },
    {
      "businessLogic": "Apply a host allowlist and price policy, permit one payment retry, verify the artifact hash, and write the accepted patch without partial files.",
      "category": "Developer tooling",
      "difficulty": "Intermediate",
      "features": [
        "agent-fetch",
        "price-inspection",
        "durable-recovery",
        "explorer-evidence"
      ],
      "fixtures": "Three issue identifiers with deterministic patch artifacts, expected hashes, and one intentionally invalid response.",
      "id": "coding-agent-purchase-hook",
      "inspiration": [
        "cloudflare-coding",
        "cloudflare-agents",
        "coinbase-code-winners"
      ],
      "negativePath": {
        "id": "repeated-payment-challenge",
        "outcome": "A repeated 402 after settlement stops immediately and a duplicate invocation does not pay twice."
      },
      "paidResource": "GET /artifacts/:issueId/patch",
      "slug": "coding-agent-purchase-hook",
      "summary": "A coding agent encounters a paid artifact, checks policy, settles once, retries once, and writes the result atomically.",
      "title": "Coding Agent Purchase Hook"
    },
    {
      "businessLogic": "Search a free catalog, check input-output compatibility, rank by deterministic quality signals, and treat discovery metadata as advisory rather than financial authority.",
      "category": "Discovery",
      "difficulty": "Advanced",
      "features": [
        "price-inspection",
        "merchant-scope",
        "request-binding",
        "independent-verification"
      ],
      "fixtures": "Six signed catalog listings with stable schemas, prices, quality signals, merchant addresses, and outputs.",
      "id": "service-bazaar",
      "inspiration": [
        "coinbase-bazaar",
        "x402-foundation"
      ],
      "negativePath": {
        "id": "listing-merchant-mismatch",
        "outcome": "A listing that advertises the wrong merchant cannot be unlocked even when it ranks first."
      },
      "paidResource": "GET /services/:serviceId/results/:fixtureId",
      "slug": "service-bazaar",
      "summary": "An agent discovers services, scores declared schemas and prices, then pays the best compatible fixed merchant.",
      "title": "Discoverable Service Bazaar"
    },
    {
      "businessLogic": "Verify an issuer allowlist, exclude stale events, weight completed and failed outcomes, and return evidence references beside the score.",
      "category": "Identity",
      "difficulty": "Advanced",
      "features": [
        "merchant-scope",
        "request-binding",
        "independent-verification",
        "explorer-evidence"
      ],
      "fixtures": "Run-relative signed events produced from a clearly identified local Ed25519 fixture issuer.",
      "id": "agent-reputation-snapshot",
      "inspiration": [
        "stellar-developer-meetings",
        "stellar-agentic-results"
      ],
      "negativePath": {
        "id": "untrusted-reputation-issuer",
        "outcome": "Events from an untrusted issuer or outside the freshness window are excluded and wrong-merchant settlement fails."
      },
      "paidResource": "GET /agents/:agentAddress/reputation",
      "slug": "agent-reputation-snapshot",
      "summary": "Buy a time-bounded reputation snapshot derived from signed execution events without treating a score as payment authority.",
      "title": "Agent Reputation Snapshot"
    },
    {
      "businessLogic": "Evaluate DAG dependencies, allocate stage budgets, propagate source provenance, and stop the workflow when verification fails.",
      "category": "Orchestration",
      "difficulty": "Advanced",
      "features": [
        "agent-fetch",
        "cumulative-budget",
        "sequence-enforcement",
        "explorer-evidence"
      ],
      "fixtures": "Three deterministic case graphs with specialist outputs and one intentional verification failure.",
      "id": "multi-agent-workflow",
      "inspiration": [
        "stellar-developer-meetings",
        "coinbase-agent-winners"
      ],
      "negativePath": {
        "id": "failed-stage-blocks-synthesis",
        "outcome": "Failed verification prevents synthesis and insufficient remaining budget blocks the next stage on-chain."
      },
      "paidResource": "GET /workflow/:caseId/:stage",
      "slug": "multi-agent-workflow",
      "summary": "A planner purchases research, verification, and synthesis artifacts as an explicit dependency graph.",
      "title": "Multi-Agent Workflow Router"
    },
    {
      "businessLogic": "Apply fixed work tiers and CPU ceilings, execute a deterministic hash chain, and require the consumer to recompute the expected digest.",
      "category": "Compute",
      "difficulty": "Intermediate",
      "features": [
        "price-inspection",
        "cumulative-budget",
        "request-binding",
        "independent-verification"
      ],
      "fixtures": "Fixed seeds and work tiers with independently calculated digest vectors and runtime ceilings.",
      "id": "compute-broker",
      "inspiration": [
        "coinbase-agent-winners",
        "coinbase-x402"
      ],
      "negativePath": {
        "id": "compute-tier-over-budget",
        "outcome": "A tier outside the mandate fails while unknown seeds and work above the server ceiling never execute."
      },
      "paidResource": "GET /compute/sha256-chain/:tier/:seedId",
      "slug": "compute-broker",
      "summary": "Buy a bounded cryptographic workload and verify the returned digest independently on the consumer side.",
      "title": "Verifiable Compute Broker"
    },
    {
      "businessLogic": "Select an allowlisted patch, run it against server-only tests, redact sensitive output, and hash the final pass-or-fail report.",
      "category": "Developer tooling",
      "difficulty": "Intermediate",
      "features": [
        "agent-fetch",
        "request-binding",
        "one-time-redemption",
        "explorer-evidence"
      ],
      "fixtures": "A small sample repository, three fixed patches, and fulfillment-only tests with stable report hashes.",
      "id": "private-test-runner",
      "inspiration": [
        "coinbase-agent-winners",
        "coinbase-code-winners"
      ],
      "negativePath": {
        "id": "patch-path-traversal",
        "outcome": "Path traversal and unknown patch identifiers are rejected while a known bad patch returns a paid failing report."
      },
      "paidResource": "GET /checks/:patchId/report",
      "slug": "private-test-runner",
      "summary": "A coding agent buys a hidden-test report for a known patch without receiving the private test source.",
      "title": "Private Test Runner"
    },
    {
      "businessLogic": "Verify the requested SHA-256, inventory a fixed lockfile, canonicalize the statement, sign it, and verify that signature offline.",
      "category": "Software supply chain",
      "difficulty": "Advanced",
      "features": [
        "request-binding",
        "independent-verification",
        "one-time-redemption",
        "explorer-evidence"
      ],
      "fixtures": "Two small artifacts, exact dependency inventories, and a clearly identified local fixture signer.",
      "id": "build-notary",
      "inspiration": [
        "coinbase-code-winners",
        "stellar-i3"
      ],
      "negativePath": {
        "id": "artifact-hash-mismatch",
        "outcome": "A tampered artifact fails local signature or hash verification and one build's payment cannot fetch another statement."
      },
      "paidResource": "GET /attestations/:artifactSha",
      "slug": "build-notary",
      "summary": "Buy a signed statement binding an artifact hash to its dependency inventory and reproducible build metadata.",
      "title": "Build Notary"
    },
    {
      "businessLogic": "Check quote freshness, score price-quality-latency policy, verify the provider merchant, and preserve output provenance and fallback reasoning.",
      "category": "AI infrastructure",
      "difficulty": "Advanced",
      "features": [
        "price-inspection",
        "merchant-scope",
        "cumulative-budget",
        "request-binding"
      ],
      "fixtures": "Clearly labeled fixture providers with stable quotes, scores, and precomputed outputs; no live-model claim.",
      "id": "model-route-bazaar",
      "inspiration": [
        "coinbase-agent-winners",
        "coinbase-bazaar"
      ],
      "negativePath": {
        "id": "stale-provider-quote",
        "outcome": "A stale quote or provider-merchant mismatch is rejected and a route above remaining budget is skipped."
      },
      "paidResource": "GET /providers/:providerId/results/:promptId",
      "slug": "model-route-bazaar",
      "summary": "Compare provider quotes, choose the lowest-cost route satisfying quality and latency policy, and buy its result.",
      "title": "Model Route Bazaar"
    },
    {
      "businessLogic": "Address content by hash, select versioned plain-language license terms, construct a local receipt, and verify every binding before use.",
      "category": "Creative commerce",
      "difficulty": "Beginner",
      "features": [
        "request-binding",
        "one-time-redemption",
        "explorer-evidence",
        "independent-verification"
      ],
      "fixtures": "Bundled text, image, and data assets with stable hashes and clearly labeled sample license terms.",
      "id": "rights-receipt",
      "inspiration": [
        "coinbase-agent-winners",
        "stellar-better"
      ],
      "negativePath": {
        "id": "license-version-rebinding",
        "outcome": "Payment for another asset or license version cannot unlock the requested content."
      },
      "paidResource": "GET /licenses/:assetId/:licenseVersion",
      "slug": "rights-receipt",
      "summary": "Purchase an exact asset-license version and receive content plus a receipt binding terms, asset hash, and payment transaction.",
      "title": "Rights Receipt"
    },
    {
      "businessLogic": "Resolve an owner-specific fixed merchant, verify dataset freshness and permitted-use metadata, and return content provenance without claiming revenue splits.",
      "category": "Data commerce",
      "difficulty": "Intermediate",
      "features": [
        "merchant-scope",
        "request-binding",
        "independent-verification",
        "explorer-evidence"
      ],
      "fixtures": "Three owner-specific datasets with stable hashes, freshness timestamps, and use-policy metadata.",
      "id": "data-owner-gateway",
      "inspiration": [
        "cloudflare-gateway",
        "cloudflare-http",
        "stellar-better"
      ],
      "negativePath": {
        "id": "dataset-owner-mismatch",
        "outcome": "A dataset mapped to another owner cannot be unlocked with the current merchant-scoped mandate."
      },
      "paidResource": "GET /datasets/:ownerId/:datasetId",
      "slug": "data-owner-gateway",
      "summary": "A data owner operates the merchant endpoint and receives payment directly when an agent unlocks that owner's dataset.",
      "title": "Data Owner Gateway"
    },
    {
      "businessLogic": "Track pending and ready states, enforce an SLA timestamp, validate the reviewer signature, and durably accept exactly one decision.",
      "category": "Operations",
      "difficulty": "Advanced",
      "features": [
        "expiry",
        "durable-recovery",
        "request-binding",
        "independent-verification"
      ],
      "fixtures": "A clearly labeled fixture reviewer writes deterministic signed decisions and one deliberately stale decision.",
      "id": "human-review-outbox",
      "inspiration": [
        "cloudflare-agents",
        "stellar-developer-meetings"
      ],
      "negativePath": {
        "id": "authority-expires-in-queue",
        "outcome": "Authority that expires while the case waits blocks settlement and stale or unsigned decisions fail local validation."
      },
      "paidResource": "GET /reviews/:caseId/decision",
      "slug": "human-review-outbox",
      "summary": "An agent buys a signed review decision only after a case reaches a ready state and the mandate remains valid.",
      "title": "Human Review Outbox"
    },
    {
      "businessLogic": "Calculate threshold duration, detect telemetry gaps, order custody transfers, and bind every finding to hashed evidence references.",
      "category": "Supply chain",
      "difficulty": "Intermediate",
      "features": [
        "expiry",
        "request-binding",
        "independent-verification",
        "explorer-evidence"
      ],
      "fixtures": "Deterministic telemetry and custody records for normal, breached, and incomplete shipments.",
      "id": "cold-chain-passport",
      "inspiration": [
        "stellar-i3",
        "stellar-better"
      ],
      "negativePath": {
        "id": "incomplete-sensor-evidence",
        "outcome": "Expired authority blocks delivery and missing sensor intervals produce an explicit incomplete result rather than a false pass."
      },
      "paidResource": "GET /shipments/:shipmentId/passport",
      "slug": "cold-chain-passport",
      "summary": "Buy a shipment passport summarizing custody handoffs, temperature excursions, and sensor continuity.",
      "title": "Cold-Chain Passport"
    },
    {
      "businessLogic": "Search bounded time windows, score carbon and capacity, enforce a deadline, and reject forecasts that are too old for scheduling.",
      "category": "Sustainability",
      "difficulty": "Intermediate",
      "features": [
        "expiry",
        "cumulative-budget",
        "request-binding",
        "independent-verification"
      ],
      "fixtures": "Fixed hourly intensity, capacity, and workload records with independently checked optimal windows.",
      "id": "carbon-aware-run-window",
      "inspiration": [
        "stellar-i3",
        "stellar-better"
      ],
      "negativePath": {
        "id": "forecast-expired",
        "outcome": "A stale forecast or infeasible window returns an explicit business outcome and expired authority cannot buy refreshed data."
      },
      "paidResource": "GET /schedules/:jobId/window",
      "slug": "carbon-aware-run-window",
      "summary": "Buy the lowest-emission execution window that still meets a workload deadline and capacity requirement.",
      "title": "Carbon-Aware Run Window"
    },
    {
      "businessLogic": "Validate segment order and weather epoch, maintain route provenance, and require a fresh contract-authorized purchase for each clearance.",
      "category": "Operations",
      "difficulty": "Intermediate",
      "features": [
        "revocation",
        "sequence-enforcement",
        "request-binding",
        "explorer-evidence"
      ],
      "fixtures": "Three deterministic route segments with fixed weather epochs, constraints, and expected clearance decisions.",
      "id": "fleet-corridor-authority",
      "inspiration": [
        "stellar-developer-meetings",
        "stellar-i3"
      ],
      "negativePath": {
        "id": "operator-revocation",
        "outcome": "After two accepted segments the user revokes authority and the third settlement is rejected by the contract."
      },
      "paidResource": "GET /corridors/:routeId/segments/:segmentId",
      "slug": "fleet-corridor-authority",
      "summary": "A fleet agent buys successive route clearances until an operator revokes its mandate and the next segment fails closed.",
      "title": "Fleet Corridor Authority"
    },
    {
      "businessLogic": "Persist used-proof claims, compare origin, method, and resource, record exact response bytes before delivery, and recover the same claim after restart.",
      "category": "Security",
      "difficulty": "Advanced",
      "features": [
        "replay-defense",
        "durable-recovery",
        "request-binding",
        "independent-verification"
      ],
      "fixtures": "Three stable vault resources while every payment proof remains live Stellar testnet evidence.",
      "id": "payment-receipt-firewall",
      "inspiration": [
        "x402-foundation",
        "coinbase-code-winners"
      ],
      "negativePath": {
        "id": "durable-replay-after-restart",
        "outcome": "Re-signing an old transaction for a new resource returns 409 and a process restart never reopens the proof."
      },
      "paidResource": "GET /vault/:resourceId",
      "slug": "payment-receipt-firewall",
      "summary": "A hardened merchant demonstrates persistent replay admission, exact request binding, and safe recovery after restart.",
      "title": "Payment Receipt Firewall"
    },
    {
      "businessLogic": "Apply a vendor allowlist, optimize cost and lead time, reject stale quotes, and explain why the selected purchase plan satisfies policy.",
      "category": "Small-business automation",
      "difficulty": "Beginner",
      "features": [
        "merchant-scope",
        "cumulative-budget",
        "expiry",
        "explorer-evidence"
      ],
      "fixtures": "Stable vendor catalogs, delivery windows, request constraints, and independently checked optimal plans.",
      "id": "procurement-guard",
      "inspiration": [
        "coinbase-agent-winners",
        "stellar-better"
      ],
      "negativePath": {
        "id": "unauthorized-vendor-and-budget",
        "outcome": "An unauthorized vendor remains blocked when cheaper and the final otherwise-valid pack is rejected after budget exhaustion."
      },
      "paidResource": "GET /vendors/:vendorId/quote-packs/:requestId",
      "slug": "procurement-guard",
      "summary": "A purchasing agent compares approved vendor quote packs and buys only a plan permitted by budget, merchant scope, and deadline.",
      "title": "Procurement Guard"
    }
  ],
  "schemaVersion": 1,
  "sources": {
    "cloudflare-agents": {
      "title": "Cloudflare pay from Agents SDK",
      "url": "https://developers.cloudflare.com/agents/tools/payments/x402/pay-from-agents-sdk/"
    },
    "cloudflare-coding": {
      "title": "Cloudflare pay from coding tools",
      "url": "https://developers.cloudflare.com/agents/tools/payments/x402/pay-with-tool-plugins/"
    },
    "cloudflare-gateway": {
      "title": "Cloudflare Monetization Gateway",
      "url": "https://blog.cloudflare.com/monetization-gateway/"
    },
    "cloudflare-http": {
      "title": "Cloudflare charge for HTTP content",
      "url": "https://developers.cloudflare.com/agents/tools/payments/x402/charge-for-http-content/"
    },
    "cloudflare-mcp": {
      "title": "Cloudflare charge for MCP tools",
      "url": "https://developers.cloudflare.com/agents/tools/payments/x402/charge-for-mcp-tools/"
    },
    "cloudflare-x402": {
      "title": "Cloudflare x402 launch",
      "url": "https://blog.cloudflare.com/x402/"
    },
    "coinbase-agent-winners": {
      "title": "Coinbase Agents in Action winners",
      "url": "https://www.coinbase.com/en-sg/developer-platform/discover/launches/agents-in-action-winners"
    },
    "coinbase-bazaar": {
      "title": "Coinbase x402 Bazaar",
      "url": "https://docs.cdp.coinbase.com/x402/bazaar"
    },
    "coinbase-code-winners": {
      "title": "Coinbase Code NYC recap",
      "url": "https://www.coinbase.com/developer-platform/discover/launches/code-nyc-recap"
    },
    "coinbase-x402": {
      "title": "Coinbase x402 overview",
      "url": "https://docs.cdp.coinbase.com/x402/welcome"
    },
    "stellar-agentic-results": {
      "title": "Stellar Q1 2026 agentic-payments results",
      "url": "https://stellar.org/blog/foundation-news/q1-2026-execution-at-network-scale"
    },
    "stellar-better": {
      "title": "Better on Stellar results",
      "url": "https://stellar.org/blog/foundation-news/better-on-stellar-challenge-from-what-if-to-what-now"
    },
    "stellar-developer-meetings": {
      "title": "Stellar developer meetings",
      "url": "https://developers.stellar.org/meetings"
    },
    "stellar-i3": {
      "title": "Stellar i3 Awards 2025",
      "url": "https://stellar.org/blog/ecosystem/stellar-i-awards-2025"
    },
    "x402-foundation": {
      "title": "x402 Foundation repository",
      "url": "https://github.com/x402-foundation/x402"
    }
  }
} as const;

export const HACKATHON_STARTER_DEPENDENCIES = {
  "@reapp-sdk/ap2": "0.2.1",
  "@reapp-sdk/core": "0.3.0",
  "@reapp-sdk/express-middleware": "0.2.1",
  "@reapp-sdk/stellar": "0.2.1",
  "@stellar/stellar-sdk": "14.6.1",
  "express": "5.2.1"
} as const;

export type HackathonStarter = (typeof HACKATHON_STARTER_CATALOG)["kits"][number];
export type HackathonStarterId = HackathonStarter["id"];
