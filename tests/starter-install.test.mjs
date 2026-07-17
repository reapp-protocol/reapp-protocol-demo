import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildStarterArchiveVerificationScript,
  buildStarterInstallCommand,
} from "../lib/starter-install.js";

const manifest = JSON.parse(await readFile(new URL("../public/starters/v1/manifest.json", import.meta.url), "utf8"));

test("all twenty copied setup commands pin the exact manifest archive and SHA-256 on both platforms", () => {
  assert.equal(manifest.kits.length, 20);
  for (const entry of manifest.kits) {
    const posix = buildStarterInstallCommand(entry, { shell: "posix" });
    const powershell = buildStarterInstallCommand(entry, { shell: "powershell" });
    for (const command of [posix, powershell]) {
      assert.match(command, new RegExp(`https://reapp\\.live/starters/v1/${entry.slug}\\.zip`));
      assert.match(command, new RegExp(entry.sha256));
      assert.match(command, /require\('node:crypto'\)\.createHash\('sha256'\)/);
      assert.match(command, /Starter integrity check failed/);
      assert.match(command, /npm ci/);
    }
    assert.match(posix, /&& unzip -q/);
    assert.match(posix, /&& npm ci$/);
    assert.doesNotMatch(posix, /curl[^|]*\|\s*(?:sh|bash)/);
    const syntax = spawnSync("zsh", ["-n", "-c", posix], { encoding: "utf8" });
    assert.equal(syntax.status, 0, `${entry.slug}: ${syntax.stderr}`);
    assert.match(powershell, /^\$ErrorActionPreference='Stop'; Invoke-WebRequest/);
    assert.match(powershell, /if \(\$LASTEXITCODE -ne 0\) \{ exit \$LASTEXITCODE \}/);
    assert.match(powershell, /Expand-Archive -LiteralPath/);
    assert.match(powershell, /Remove-Item -LiteralPath/);
    assert.doesNotMatch(powershell, /\bunzip\b|\brm\b/);
  }
});

test("manifest command construction rejects every shell-injection boundary", () => {
  const valid = manifest.kits[0];
  for (const entry of [
    { ...valid, slug: "hackathon;rm-rf" },
    { ...valid, archive: "/starters/v1/other.zip" },
    { ...valid, sha256: "A".repeat(64) },
    { ...valid, sha256: "0".repeat(63) },
  ]) assert.throws(() => buildStarterInstallCommand(entry), /slug|archive|SHA-256/);
  assert.throws(() => buildStarterInstallCommand(valid, { shell: "cmd" }), /shell/);
});

test("the verifier accepts exact bytes and deletes a tampered download before extraction", async (context) => {
  const temporary = await mkdtemp(resolve(tmpdir(), "reapp-starter-integrity-"));
  context.after(() => rm(temporary, { recursive: true, force: true }));
  const file = "reapp-safe-starter.zip";
  const path = resolve(temporary, file);
  const expected = "239f59ed55e737c77147cf55ad0c1b030b6d7ee748a7426952f9b852d5a935e5";
  await writeFile(path, "payload", "utf8");
  const accepted = spawnSync(process.execPath, ["-e", buildStarterArchiveVerificationScript({ file, sha256: expected })], {
    cwd: temporary,
    encoding: "utf8",
  });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(await readFile(path, "utf8"), "payload");

  await writeFile(path, "tampered", "utf8");
  const rejected = spawnSync(process.execPath, ["-e", buildStarterArchiveVerificationScript({ file, sha256: expected })], {
    cwd: temporary,
    encoding: "utf8",
  });
  assert.notEqual(rejected.status, 0);
  await assert.rejects(readFile(path), /ENOENT/);
});
