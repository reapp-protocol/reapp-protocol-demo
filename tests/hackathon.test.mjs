import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const protectedHashes = {
  "app/express/page.tsx": "77c30289d70d1df16df9928148b6b7a9f9d50248a541100cbda1580a56a98bbf",
  "app/express/layout.tsx": "440134d79d32d0b3fb4e00b1adea361dbf17f9bef9e5f80f57f7db0d7957be66",
  "app/api/express/route.ts": "645a2a92788b61f42537ee0d9f4980c7324a0f76fadd68239939da17b0854141",
  "app/api/express/[sessionId]/source/[resource]/route.ts": "022c94e6c368357692c1981f08f52aea41c28ef39eadde56ca501280a6e552a5",
  "lib/express-demo.ts": "c48c4e776f0380b55992a5deac32d00fc9905c2cc7b3a8b27925fe6b716f564d",
};

test("the verified Express runtime remains byte-for-byte unchanged", async () => {
  for (const [path, expected] of Object.entries(protectedHashes)) {
    const source = await read(path);
    const actual = createHash("sha256").update(source).digest("hex");
    assert.equal(actual, expected, path);
  }
});

test("navigation exposes Hackathon without deleting the direct Video route", async () => {
  const [nav, video] = await Promise.all([read("components/Nav.tsx"), read("app/video/page.tsx")]);
  assert.match(nav, /href: "\/hackathon", label: "Hackathon"/);
  assert.doesNotMatch(nav, /href: "\/video", label: "Video"/);
  assert.match(nav, /href: "\/express", label: "Express"/);
  assert.ok(video.length > 100);
});

test("the Hackathon page keeps the established responsive pattern and complete guide", async () => {
  const [page, layout, sitemap] = await Promise.all([
    read("app/hackathon/page.tsx"),
    read("app/hackathon/layout.tsx"),
    read("app/sitemap.ts"),
  ]);
  for (const required of [
    "Use this starter",
    "Copy setup command",
    "npm run demo",
    "Read the README",
    "Optional hosted walkthrough",
    "Merchant scope",
    "Replay defense",
    "Recovery",
    "Explorer evidence",
    "20 starter packs",
    "Integrity manifest",
    "sessionStorage",
    "polling hosted /express",
    "sm:text-6xl",
    "lg:grid-cols",
    "min-w-0",
    "overflow-auto",
  ]) assert.match(page, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), required);
  assert.match(layout, /path: "\/hackathon"/);
  assert.match(sitemap, /"\/hackathon"/);
  const guidedSetup = page.match(/const SETUP_COMMAND = "([^"]+)";/)?.[1];
  assert.ok(guidedSetup, "guided setup command is missing");
  assert.match(guidedSetup, /\/starters\/v1\/hackathon\.zip/);
  assert.match(guidedSetup, /npm ci$/);
  assert.doesNotMatch(guidedSetup, /npm run/);
  const starterSetup = page.match(/const starterCommand = \(slug: string\) =>\s*`([^`]+)`;/)?.[1];
  assert.ok(starterSetup, "starter setup helper is missing");
  assert.match(starterSetup, /\/starters\/v1\/\$\{slug\}\.zip/);
  assert.match(starterSetup, /npm ci$/);
  assert.doesNotMatch(starterSetup, /npm run/);
  assert.match(page, /github\.com\/reapp-protocol\/reapp-protocol-demo\/blob\/main\/starters\/\$\{kit\.slug\}\/README\.md/);
  assert.doesNotMatch(page, /degit/);
  assert.doesNotMatch(page, /npm ci && npm run/);
});

test("the starter is deterministic, typed by package metadata, and testnet-only", async () => {
  const paths = [
    "starters/hackathon/package.json",
    "starters/hackathon/package-lock.json",
    "starters/hackathon/.gitignore",
    "starters/hackathon/.env.example",
    "starters/hackathon/README.md",
    "starters/hackathon/src/consumer.mjs",
    "starters/hackathon/src/fulfillment.mjs",
    "starters/hackathon/src/hosted.mjs",
    "starters/hackathon/shared/contract.mjs",
    "starters/hackathon/shared/fulfillment.mjs",
  ];
  const sources = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await read(path)])));
  const manifest = JSON.parse(sources["starters/hackathon/package.json"]);
  assert.equal(manifest.dependencies["@reapp-sdk/core"], "0.3.0");
  assert.equal(manifest.dependencies["@reapp-sdk/stellar"], "0.2.1");
  assert.equal(manifest.dependencies["@reapp-sdk/ap2"], "0.2.1");
  assert.equal(manifest.dependencies["@reapp-sdk/express-middleware"], "0.2.1");
  assert.ok(manifest.scripts.demo);
  assert.ok(manifest.scripts.fulfillment);
  assert.equal(manifest.scripts.hosted, "node src/hosted.mjs");
  assert.match(sources["starters/hackathon/.gitignore"], /^\.env$/m);
  assert.match(sources["starters/hackathon/.gitignore"], /^\.reapp\/$/m);
  assert.match(sources["starters/hackathon/src/consumer.mjs"], /runLocalTestnetDemo/);
  assert.match(sources["starters/hackathon/src/fulfillment.mjs"], /startFulfillmentServer/);
  assert.match(sources["starters/hackathon/src/hosted.mjs"], /\/api\\\/express\\\//, "the hosted companion must report verified rejection to the exact workspace path");
  assert.match(sources["starters/hackathon/src/hosted.mjs"], /createBoundTestnetConsumer/);
  assert.match(sources["starters/hackathon/src/hosted.mjs"], /purchaseVerifiedBoundJson/);
  assert.match(sources["starters/hackathon/src/hosted.mjs"], /expectVerifiedBudgetRejection/);
  assert.match(sources["starters/hackathon/shared/contract.mjs"], /proofPolicy:\s*["']bound-v2-only["']/);
  assert.match(sources["starters/hackathon/shared/contract.mjs"], /reapp\.agent/);
  assert.match(sources["starters/hackathon/shared/fulfillment.mjs"], /createBoundReappPaidJsonRoute/);
  const combined = Object.values(sources).join("\n");
  assert.doesNotMatch(combined, /\bS[A-Z2-7]{55}\b/, "no Stellar secret seed may be committed");
  assert.doesNotMatch(combined, /@reapp\//, "only the @reapp-sdk namespace is valid");
  assert.doesNotMatch(sources["starters/hackathon/.env.example"], /mainnet/i, "the starter environment must remain testnet-only");
  assert.doesNotMatch(sources["starters/hackathon/src/consumer.mjs"], /reapp\.mainnet/i);
  assert.doesNotMatch(sources["starters/hackathon/src/fulfillment.mjs"], /reapp\.mainnet/i);
});

test("the hosted page command stays in parity with the generated starter", async () => {
  const [page, manifestSource, hosted] = await Promise.all([
    read("app/hackathon/page.tsx"),
    read("starters/hackathon/package.json"),
    read("starters/hackathon/src/hosted.mjs"),
  ]);
  const manifest = JSON.parse(manifestSource);
  assert.equal(manifest.scripts.hosted, "node src/hosted.mjs");
  assert.match(page, /npm run hosted -- --endpoint=/);
  assert.doesNotMatch(page, /npm run demo -- --endpoint=/);
  assert.match(hosted, /parseNamedArgs\(process\.argv\.slice\(2\), \["endpoint", "merchant"\]\)/);
});

test("new public copy follows repository terminology rules", async () => {
  const combined = [
    await read("app/hackathon/page.tsx"),
    await read("app/hackathon/layout.tsx"),
    await read("app/llms.txt/route.ts"),
    await read("app/llms-full.txt/route.ts"),
    await read("starters/hackathon/README.md"),
  ].join("\n");
  assert.doesNotMatch(combined, /\b(?:audit|tranche|milestone)\b/i);
  assert.doesNotMatch(combined, /\bNO MOCKS\b/i);
  assert.doesNotMatch(combined, /@reapp\//, "only the @reapp-sdk namespace is valid");
  assert.doesNotMatch(combined, /Hackathon starter[\s\S]*?calls the hosted endpoint through agent\.fetch\(\)/);
  assert.match(combined, /inspects the exact 402 challenge, submits the request-bound contract payment/);
  for (const version of [
    "@reapp-sdk/core 0.3.0",
    "@reapp-sdk/stellar 0.2.1",
    "@reapp-sdk/ap2 0.2.1",
    "@reapp-sdk/express-middleware 0.2.1",
    "reapp-protocol-cli 0.1.4",
  ]) assert.match(combined, new RegExp(version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), version);
});
