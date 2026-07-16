import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  GENERATED_METADATA_RELATIVE_PATH,
  REPOSITORY_ROOT,
  assertSafeRelativePath,
  buildPublicCatalog,
  loadCatalogInputs,
  renderGeneratedMetadata,
  resolveRepositoryPath,
  stableStringify,
} from "../scripts/starters/catalog.mjs";

test("generation is deterministic and preserves all twenty public catalog entries", async () => {
  const { catalog, dependencyPolicy } = await loadCatalogInputs();
  const first = renderGeneratedMetadata(catalog, dependencyPolicy);
  const second = renderGeneratedMetadata(structuredClone(catalog), structuredClone(dependencyPolicy));
  assert.equal(first, second);
  assert.equal(buildPublicCatalog(catalog).kits.length, 20);
  assert.deepEqual(buildPublicCatalog(catalog), JSON.parse(stableStringify(catalog)));
  assert.equal(first.match(/^\s+"slug":/gm)?.length, 20);
  assert.doesNotMatch(first, /@reapp\//);
  assert.doesNotMatch(first, /\b(?:audit|tranche|milestone)\b/i);
});

test("generated TypeScript is byte-for-byte current", async () => {
  const { catalog, dependencyPolicy } = await loadCatalogInputs();
  const generated = await readFile(resolveRepositoryPath(GENERATED_METADATA_RELATIVE_PATH), "utf8");
  assert.equal(generated, renderGeneratedMetadata(catalog, dependencyPolicy));
});

test("dependency policy uses only exact approved package versions", async () => {
  const { dependencyPolicy } = await loadCatalogInputs();
  assert.equal(dependencyPolicy.installCommand, "npm ci");
  assert.deepEqual(dependencyPolicy.rules, {
    exactVersions: true,
    lockfileRequired: true,
    workspacesAllowed: false,
    localPathDependenciesAllowed: false,
    symlinksAllowed: false,
  });
  for (const [name, version] of Object.entries(dependencyPolicy.dependencies)) {
    assert.doesNotMatch(name, /^@reapp\//);
    assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  }
});

test("repository paths cannot escape or use ambiguous separators", () => {
  for (const unsafe of ["../escape", "nested/../../escape", "/absolute", "C:\\escape", "nested//file", ".", "safe/../escape", "safe\\file"]) {
    assert.throws(() => assertSafeRelativePath(unsafe), /must|cannot|invalid|normalized|empty/);
  }
  assert.equal(assertSafeRelativePath("starter-kit-src/catalog.json"), "starter-kit-src/catalog.json");
  assert.equal(resolveRepositoryPath("starter-kit-src/catalog.json").startsWith(`${REPOSITORY_ROOT}/`), true);
});

test("check mode is read-only, current, and rejects all other arguments", () => {
  const checked = spawnSync(process.execPath, ["scripts/starters/generate.mjs", "--check"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /verified: 20 kits/);

  const rejected = spawnSync(process.execPath, ["scripts/starters/generate.mjs", "--output", "../escape"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });
  assert.equal(rejected.status, 2);
  assert.match(rejected.stderr, /^Usage:/);
});

test("generation scripts use only local files and Node built-ins", async () => {
  for (const relativePath of ["scripts/starters/catalog.mjs", "scripts/starters/generate.mjs", "scripts/starters/verify.mjs"]) {
    const source = await readFile(resolveRepositoryPath(relativePath), "utf8");
    for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
      assert.match(match[1], /^(?:node:|\.\/)/, `${relativePath} imports ${match[1]}`);
    }
    assert.doesNotMatch(source, /\bfetch\s*\(|node:https|node:http/);
  }
});
