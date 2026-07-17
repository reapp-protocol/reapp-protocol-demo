import assert from "node:assert/strict";
import test from "node:test";

import { createBeginnerDemoPresenter } from "../starter-kit-src/shared/presenter.mjs";

function presentation(overrides = {}) {
  return {
    id: "research-source-scout",
    title: "Research Source Scout",
    summary: "A research agent buys protected sources and stops at its limit.",
    negativePathId: "budget-exhausted",
    negativePathOutcome: "The fourth purchase is rejected because it is outside the approved budget.",
    ...overrides,
  };
}

function scenario(overrides = {}) {
  return {
    budgetXlm: "3.0000000",
    plan: [{}, {}, {}],
    ...overrides,
  };
}

test("beginner narration explains the complete 402, contract, and 200 flow without raw telemetry", () => {
  const lines = [];
  const presenter = createBeginnerDemoPresenter({
    scenario: scenario(),
    starter: presentation(),
    write: (line) => lines.push(line),
    verbose: false,
  });
  const txHash = "a".repeat(64);
  for (const event of [
    { type: "run_started", runId: "private-internal-id" },
    { type: "accounts_funded" },
    { type: "mandate_ready", evidence: { hidden: "do-not-print" } },
    { type: "fulfillment_started", origin: "http://127.0.0.1:4021" },
    { type: "challenge_402_verified", path: "/source/market", priceXlm: "1.0000000" },
    { type: "purchase_started", path: "/source/market" },
    { type: "delivery_accepted", path: "/source/market", txHash },
    { type: "delivery_accepted", path: "/source/academic", txHash: "b".repeat(64) },
    { type: "delivery_accepted", path: "/source/news", txHash: "c".repeat(64) },
    { type: "negative_path_verified", evidence: { hidden: "do-not-print" } },
    { type: "consumer_output_verified", evidence: { hidden: "do-not-print" } },
    { type: "run_complete" },
  ]) presenter.onEvent(event);
  presenter.finish({ delivered: 3 });

  const output = lines.join("\n");
  assert.match(output, /____  _____    _    ____  ____/);
  assert.match(output, /\| \|_\) \|  _\|/);
  assert.match(output, /Stellar testnet — demo funds only, no real money/);
  assert.match(output, /HTTP 402 Payment Required/);
  assert.match(output, /API is protected and is asking the agent to pay/);
  assert.match(output, /contract to approve 1 XLM/);
  assert.match(output, /HTTP 200 OK/);
  assert.match(output, new RegExp(`https://stellar\\.expert/explorer/testnet/tx/${txHash}`));
  assert.match(output, /The fourth purchase is rejected because it is outside the approved budget/);
  assert.match(output, /This can take a little longer when Stellar must advance time/);
  assert.match(output, /What just happened:/);
  assert.match(output, /3 approved payments returned 3 protected results/);
  assert.match(output, /open scenario\/scenario\.mjs/);
  assert.doesNotMatch(output, /\[(?:run_started|accounts_funded|delivery_accepted|run_complete)\]/);
  assert.doesNotMatch(output, /private-internal-id|do-not-print/);
});

test("presenter uses honest singular language and recovery wording", () => {
  const lines = [];
  const presenter = createBeginnerDemoPresenter({
    scenario: scenario({ budgetXlm: "1.0000000", plan: [{}] }),
    starter: presentation({
      title: "Payment Receipt Firewall",
      negativePathId: "durable-replay-after-restart",
      negativePathOutcome: "The exact same proof recovers byte-identical output without running paid work again.",
    }),
    write: (line) => lines.push(line),
  });
  presenter.onEvent({ type: "accounts_funded" });
  presenter.onEvent({ type: "mandate_ready" });
  presenter.onEvent({ type: "fulfillment_started" });
  presenter.onEvent({ type: "delivery_accepted", txHash: "b".repeat(64) });
  presenter.onEvent({ type: "negative_path_verified" });
  presenter.onEvent({ type: "consumer_output_verified" });
  presenter.finish({ delivered: 1 });
  const output = lines.join("\n");
  assert.match(output, /Buying 1 protected result\.\.\./);
  assert.match(output, /1 approved payment returned 1 protected result/);
  assert.match(output, /exact same proof recovers byte-identical output/);
  assert.doesNotMatch(output, /unsafe action|1 approved payments|1 protected results/);
});

test("console narration cannot interrupt the runtime on malformed or scenario-specific events", () => {
  const lines = [];
  const presenter = createBeginnerDemoPresenter({
    scenario: scenario(),
    starter: presentation(),
    write: (line) => lines.push(line),
    verbose: true,
  });
  assert.doesNotThrow(() => presenter.onEvent(undefined));
  assert.doesNotThrow(() => presenter.onEvent({ type: "scenario-private-event", secret: "not-printed" }));
  assert.doesNotThrow(() => presenter.onEvent({ type: "challenge_402_verified", path: null, priceXlm: null }));
  const output = lines.join("\n");
  assert.match(output, /developer: \[unrecognized_event\]/);
  assert.match(output, /developer: \[scenario-private-event\]/);
  assert.doesNotMatch(output, /not-printed/);
});

test("a broken terminal output stream cannot interrupt live runtime events", () => {
  for (const verbose of [false, true]) {
    let failWrites = false;
    const presenter = createBeginnerDemoPresenter({
      scenario: scenario(),
      starter: presentation(),
      verbose,
      write() {
        if (failWrites) throw new Error("terminal closed");
      },
    });
    failWrites = true;
    assert.doesNotThrow(() => presenter.onEvent({ type: "accounts_funded" }));
    assert.doesNotThrow(() => presenter.onEvent({ type: "delivery_accepted", txHash: "d".repeat(64) }));
    assert.doesNotThrow(() => presenter.onEvent(undefined));
  }
});
