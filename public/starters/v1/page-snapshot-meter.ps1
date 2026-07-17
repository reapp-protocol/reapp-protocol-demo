$ErrorActionPreference = 'Stop'
$archive = 'reapp-page-snapshot-meter.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/page-snapshot-meter.zip' -OutFile $archive
  node -e "const f='reapp-page-snapshot-meter.zip',e='682fffc607fc6b4ed2a01a3e0dc25eac3e8cbf3a5405dee6b7c1c326c16642c4',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
