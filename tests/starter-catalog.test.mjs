import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const unique = (values, label) => {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
};

test("the catalog fixes exactly twenty distinct GET-only starter contracts", async () => {
  const catalog = JSON.parse(await read("starter-kit-src/catalog.json"));
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.catalogId, "reapp-hackathon-starters-v1");
  assert.deepEqual(catalog.constraints, {
    network: "stellar-testnet",
    paidMethod: "GET",
    proofPolicy: "bound-v2-only",
    runtime: "local-consumer-and-fulfillment",
    fixturePolicy: "deterministic-and-clearly-labeled",
    compatibilityClaim: "reapp-bound-v2",
  });
  assert.equal(catalog.kits.length, 20);
  unique(catalog.kits.map((kit) => kit.id), "kit ids");
  unique(catalog.kits.map((kit) => kit.slug), "kit slugs");
  unique(catalog.kits.map((kit) => kit.title), "kit titles");
  unique(catalog.kits.map((kit) => kit.paidResource), "paid resources");
  unique(catalog.kits.map((kit) => kit.negativePath.id), "negative paths");
  assert.equal(catalog.kits[0].id, "research-source-scout");
  assert.equal(catalog.kits[0].slug, "hackathon", "the verified starter keeps its stable path");
  for (const kit of catalog.kits) {
    assert.match(kit.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(kit.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(kit.paidResource, /^GET \/[A-Za-z0-9:/-]+$/);
    assert.ok(kit.summary.length >= 40, `${kit.id} summary`);
    assert.ok(kit.businessLogic.length >= 60, `${kit.id} business logic`);
    assert.ok(kit.fixtures.length >= 40, `${kit.id} fixtures`);
    assert.ok(kit.negativePath.outcome.length >= 40, `${kit.id} negative path`);
    assert.ok(kit.features.length >= 3, `${kit.id} features`);
    unique(kit.features, `${kit.id} features`);
    assert.ok(kit.inspiration.length >= 1, `${kit.id} inspiration`);
    for (const source of kit.inspiration) {
      assert.ok(catalog.sources[source], `${kit.id} cites missing source ${source}`);
    }
  }
});

test("the catalog covers every promised contract and recovery lesson", async () => {
  const catalog = JSON.parse(await read("starter-kit-src/catalog.json"));
  const features = new Set(catalog.kits.flatMap((kit) => kit.features));
  for (const required of [
    "agent-fetch",
    "cumulative-budget",
    "merchant-scope",
    "expiry",
    "revocation",
    "replay-defense",
    "durable-recovery",
    "request-binding",
    "independent-verification",
    "explorer-evidence",
  ]) assert.ok(features.has(required), `missing ${required}`);
});

test("catalog sources are public primary evidence and terminology remains valid", async () => {
  const [catalogSource, schemaSource] = await Promise.all([
    read("starter-kit-src/catalog.json"),
    read("starter-kit-src/catalog.schema.json"),
  ]);
  const catalog = JSON.parse(catalogSource);
  for (const [id, source] of Object.entries(catalog.sources)) {
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(source.url, /^https:\/\//);
    assert.doesNotMatch(source.url, /(?:search|chatgpt|claude)\./i);
  }
  const combined = `${catalogSource}\n${schemaSource}`;
  assert.doesNotMatch(combined, /@reapp\//, "only the @reapp-sdk namespace is valid");
  assert.doesNotMatch(combined, /\b(?:audit|tranche|milestone)\b/i);
  assert.doesNotMatch(combined, /paid POST|body-bound payment|generic x402-v2 compatibility/i);
});
