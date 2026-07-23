$ErrorActionPreference = 'Stop'
$archive = 'reapp-page-snapshot-meter.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/page-snapshot-meter.zip' -OutFile $archive
  node -e "const f='reapp-page-snapshot-meter.zip',e='7619c46e76076b5bf3409ef97dbb2debc790115b2a9a46fce785e06bda6f8ccd',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
