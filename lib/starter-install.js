const STARTER_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[0-9a-f]{64}$/;

function requireSlug(value) {
  if (typeof value !== "string" || !STARTER_SLUG.test(value)) {
    throw new Error("starter slug must be lowercase kebab-case");
  }
  return value;
}

function requireSha256(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new Error("starter SHA-256 must be 64 lowercase hexadecimal characters");
  }
  return value;
}

function requireArchive(value, slug) {
  const expected = `/starters/v1/${slug}.zip`;
  if (value !== expected) throw new Error(`starter archive must be ${expected}`);
  return value;
}

export function buildStarterArchiveVerificationScript({ file, sha256 }) {
  const checkedSha256 = requireSha256(sha256);
  if (typeof file !== "string" || !/^reapp-[a-z0-9]+(?:-[a-z0-9]+)*\.zip$/.test(file)) {
    throw new Error("starter archive filename is invalid");
  }
  return `const f='${file}',e='${checkedSha256}',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}`;
}

export function buildStarterInstallCommand(entry, { shell = "posix" } = {}) {
  if (!entry || typeof entry !== "object") throw new Error("starter manifest entry is required");
  if (shell !== "posix" && shell !== "powershell") {
    throw new Error("starter shell must be posix or powershell");
  }
  const slug = requireSlug(entry.slug);
  const archive = requireArchive(entry.archive, slug);
  const sha256 = requireSha256(entry.sha256);
  const file = `reapp-${slug}.zip`;
  const verify = buildStarterArchiveVerificationScript({ file, sha256 });
  if (shell === "powershell") {
    return `$ErrorActionPreference='Stop'; Invoke-WebRequest -Uri 'https://reapp.live${archive}' -OutFile '${file}'; node -e "${verify}"; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; Expand-Archive -LiteralPath '${file}' -DestinationPath '.' -Force; Remove-Item -LiteralPath '${file}'; npm ci; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`;
  }
  return `curl -fsSLo ${file} https://reapp.live${archive} && node -e "${verify}" && unzip -q ${file} && rm ${file} && npm ci`;
}
