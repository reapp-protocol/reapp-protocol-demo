$ErrorActionPreference = 'Stop'
$archive = 'reapp-coding-agent-purchase-hook.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/coding-agent-purchase-hook.zip' -OutFile $archive
  node -e "const f='reapp-coding-agent-purchase-hook.zip',e='627ea39b5c2272c69347a6420e6740f06cd69e00d77dda720680498235da6447',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
  if ($LASTEXITCODE -ne 0) { throw 'Starter integrity verification failed' }
  Expand-Archive -LiteralPath $archive -DestinationPath '.' -Force
  Remove-Item -LiteralPath $archive
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
  Write-Host ''
  Write-Host 'REAPP starter installed. Run: npm run demo'
} finally {
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
}
