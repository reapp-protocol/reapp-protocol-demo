import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
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
import {
  CANONICAL_LOCK_RELATIVE_PATH,
  GENERATED_ARCHIVES_RELATIVE_PATH,
  GENERATED_STARTERS_RELATIVE_PATH,
  buildStarterArtifacts,
  createStoredZip,
  extractStoredZip,
  readStoredZipEntries,
} from "../scripts/starters/materialize.mjs";

async function listFiles(root, prefix = "") {
  const entries = await readdir(prefix ? resolve(root, prefix) : root, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else files.push(path);
  }
  return files;
}

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
  assert.match(checked.stdout, /verified: 20 kits, 20 deterministic archives/);

  const rejected = spawnSync(process.execPath, ["scripts/starters/generate.mjs", "--output", "../escape"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });
  assert.equal(rejected.status, 2);
  assert.match(rejected.stderr, /^Usage:/);
});

test("generation scripts use only local files and Node built-ins", async () => {
  for (const relativePath of ["scripts/starters/catalog.mjs", "scripts/starters/materialize.mjs", "scripts/starters/generate.mjs", "scripts/starters/verify.mjs"]) {
    const source = await readFile(resolveRepositoryPath(relativePath), "utf8");
    for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
      assert.match(match[1], /^(?:node:|\.{1,2}\/)/, `${relativePath} imports ${match[1]}`);
    }
    assert.doesNotMatch(source, /\bfetch\s*\(|node:https|node:http/);
  }
});

test("all twenty generated packages are self-contained and use one exact canonical lockfile", async () => {
  const artifacts = await buildStarterArtifacts();
  const canonicalLock = await readFile(resolveRepositoryPath(CANONICAL_LOCK_RELATIVE_PATH));
  assert.equal(artifacts.kits.length, 20);
  for (const { kit, files } of artifacts.kits) {
    assert.equal(files.get("package-lock.json").equals(canonicalLock), true, kit.id);
    const packageJson = JSON.parse(files.get("package.json").toString("utf8"));
    assert.deepEqual(packageJson.dependencies, artifacts.dependencyPolicy.dependencies);
    assert.equal(packageJson.scripts.demo, "node src/consumer.mjs");
    assert.equal(packageJson.scripts.fulfillment, "node src/fulfillment.mjs");
    assert.equal(packageJson.scripts.check, "node src/check.mjs");
    assert.equal(files.has("README.md"), true);
    assert.equal(files.has(".env.example"), true);
    assert.equal(files.has(".gitignore"), true);
    assert.equal(files.has("scenario/scenario.mjs"), true);
    assert.equal(files.has("scenario/support.mjs"), true);
    assert.equal(files.has("shared/local-demo.mjs"), true);
    assert.equal(files.has("src/consumer.mjs"), true);
    assert.equal(files.has("src/fulfillment.mjs"), true);
    for (const [path, contents] of files) {
      assert.doesNotMatch(path, /(?:^|\/)\.env$/);
      if (path.endsWith(".mjs") || path.endsWith(".md") || path.endsWith(".json") || path.startsWith(".")) {
        assert.doesNotMatch(contents.toString("utf8"), /@reapp\//, `${kit.id}/${path}`);
      }
    }
  }
});

test("STORE-mode archives are deterministic and extract byte-for-byte to their package trees", async (context) => {
  const artifacts = await buildStarterArtifacts();
  const temporary = await mkdtemp(resolve(tmpdir(), "reapp-starters-"));
  context.after(() => rm(temporary, { recursive: true, force: true }));

  for (const { kit, files, archive, sha256 } of artifacts.kits) {
    assert.equal(createStoredZip(files).equals(archive), true, `${kit.id} archive changed within one process`);
    assert.equal(createHash("sha256").update(archive).digest("hex"), sha256);
    const entries = readStoredZipEntries(archive);
    assert.deepEqual([...entries.keys()], [...files.keys()].sort((left, right) => left.localeCompare(right, "en")));
    const destination = resolve(temporary, kit.slug);
    await extractStoredZip(archive, destination);
    assert.deepEqual(await listFiles(destination), [...files.keys()].sort((left, right) => left.localeCompare(right, "en")));
    for (const [path, expected] of files) {
      assert.equal((await readFile(resolve(destination, path))).equals(expected), true, `${kit.id}/${path}`);
    }
  }
});

test("archive paths reject traversal and unapproved hidden state while retaining safe starter dotfiles", () => {
  const safe = createStoredZip(new Map([
    [".env.example", Buffer.from("example", "utf8")],
    [".gitignore", Buffer.from(".env\n", "utf8")],
    ["src/index.mjs", Buffer.from("export {};\n", "utf8")],
  ]));
  assert.deepEqual([...readStoredZipEntries(safe).keys()], [".env.example", ".gitignore", "src/index.mjs"]);
  for (const path of ["../outside", "src/../../outside", ".env", ".git/config", "src/.secret"]) {
    assert.throws(() => createStoredZip(new Map([[path, Buffer.from("x")]])), /path|dot|leave|normalized|unsupported/);
  }
  const forward = createStoredZip(new Map([["a", Buffer.from("1")], ["b", Buffer.from("2")]]));
  const reverse = createStoredZip(new Map([["b", Buffer.from("2")], ["a", Buffer.from("1")]]));
  assert.equal(forward.equals(reverse), true);
});

test("manifest hashes, sizes, paths, and generated trees match the committed archives", async () => {
  const artifacts = await buildStarterArtifacts();
  assert.equal(artifacts.manifest.kits.length, 20);
  for (const [index, entry] of artifacts.manifest.kits.entries()) {
    const built = artifacts.kits[index];
    assert.equal(entry.id, built.kit.id);
    assert.equal(entry.slug, built.kit.slug);
    assert.equal(entry.archive, `/starters/v1/${built.kit.slug}.zip`);
    assert.equal(entry.sha256, createHash("sha256").update(built.archive).digest("hex"));
    assert.equal(entry.size, built.archive.byteLength);
    assert.equal(entry.files, built.files.size);
    const committedArchive = await readFile(resolveRepositoryPath(`${GENERATED_ARCHIVES_RELATIVE_PATH}/${entry.slug}.zip`));
    assert.equal(committedArchive.equals(built.archive), true, entry.id);
    for (const [path, contents] of built.files) {
      const committed = await readFile(resolveRepositoryPath(`${GENERATED_STARTERS_RELATIVE_PATH}/${entry.slug}/${path}`));
      assert.equal(committed.equals(contents), true, `${entry.id}/${path}`);
    }
  }
  assert.equal(
    (await readFile(resolveRepositoryPath(`${GENERATED_ARCHIVES_RELATIVE_PATH}/manifest.json`))).equals(artifacts.manifestSource),
    true,
  );
});
