import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildStarterArchiveVerificationScript,
  buildStarterInstallCommand,
  buildStarterInstallerScript,
} from "../lib/starter-install.js";

const manifest = JSON.parse(await readFile(new URL("../public/starters/v1/manifest.json", import.meta.url), "utf8"));

test("all twenty copied setup commands verify pinned installers that verify pinned archives", () => {
  assert.equal(manifest.kits.length, 20);
  for (const entry of manifest.kits) {
    const posix = buildStarterInstallCommand(entry, { shell: "posix" });
    const powershell = buildStarterInstallCommand(entry, { shell: "powershell" });
    const posixInstaller = buildStarterInstallerScript(entry, { shell: "posix" });
    const powershellInstaller = buildStarterInstallerScript(entry, { shell: "powershell" });
    assert.equal(createHash("sha256").update(posixInstaller).digest("hex"), entry.installers.posix.sha256);
    assert.equal(createHash("sha256").update(powershellInstaller).digest("hex"), entry.installers.powershell.sha256);
    for (const installer of [posixInstaller, powershellInstaller]) {
      assert.match(installer, new RegExp(`https://reapp\\.live/starters/v1/${entry.slug}\\.zip`));
      assert.match(installer, new RegExp(entry.sha256));
      assert.match(installer, /require\('node:crypto'\)\.createHash\('sha256'\)/);
      assert.match(installer, /Starter integrity check failed/);
      assert.match(installer, /npm ci/);
    }
    assert.match(posix, new RegExp(`https://reapp\\.live${entry.installers.posix.path}`));
    assert.match(posix, /sh reapp-setup\.sh/);
    assert.match(posix, new RegExp(entry.installers.posix.sha256));
    assert.ok(posix.length <= 500, `${entry.slug}: POSIX setup command is too long`);
    assert.doesNotMatch(posix, new RegExp(entry.sha256));
    assert.match(posix, /node -e/);
    assert.doesNotMatch(posix, /unzip -q|npm ci/);
    assert.doesNotMatch(posix, /curl[^|]*\|\s*(?:sh|bash)/);
    const syntax = spawnSync("zsh", ["-n", "-c", posix], { encoding: "utf8" });
    assert.equal(syntax.status, 0, `${entry.slug}: ${syntax.stderr}`);
    assert.match(powershell, /^\$ErrorActionPreference='Stop'; \$f='reapp-setup\.ps1'; try \{ Invoke-WebRequest/);
    assert.match(powershell, new RegExp(`https://reapp\\.live${entry.installers.powershell.path}`));
    assert.match(powershell, new RegExp(entry.installers.powershell.sha256));
    assert.match(powershell, /Get-FileHash/);
    assert.match(powershell, /powershell\.exe -NoProfile -ExecutionPolicy Bypass -File \$f/);
    assert.ok(powershell.length <= 650, `${entry.slug}: PowerShell setup command is too long`);
    assert.match(powershell, /if \(\$LASTEXITCODE -ne 0\)/);
    assert.match(powershell, /Remove-Item -LiteralPath/);
    assert.doesNotMatch(powershell, new RegExp(entry.sha256));
    assert.doesNotMatch(powershell, /Expand-Archive|npm ci/);
    assert.doesNotMatch(powershell, /\bunzip\b|\brm\b/);
    assert.match(posixInstaller, /^#!\/bin\/sh\nset -eu/);
    assert.match(posixInstaller, /unzip -q/);
    assert.match(powershellInstaller, /Expand-Archive -LiteralPath/);
  }
});

test("manifest command construction rejects every shell-injection boundary", () => {
  const valid = manifest.kits[0];
  for (const entry of [
    { ...valid, slug: "hackathon;rm-rf" },
    { ...valid, archive: "/starters/v1/other.zip" },
    { ...valid, sha256: "A".repeat(64) },
    { ...valid, sha256: "0".repeat(63) },
    { ...valid, installers: { ...valid.installers, posix: { ...valid.installers.posix, path: "/starters/v1/other.sh" } } },
    { ...valid, installers: { ...valid.installers, posix: { ...valid.installers.posix, sha256: "0".repeat(63) } } },
  ]) assert.throws(() => buildStarterInstallCommand(entry), /slug|archive|SHA-256|installer/);
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
