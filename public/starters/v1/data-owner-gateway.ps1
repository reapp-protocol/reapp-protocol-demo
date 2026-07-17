$ErrorActionPreference = 'Stop'
$archive = 'reapp-data-owner-gateway.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/data-owner-gateway.zip' -OutFile $archive
  node -e "const f='reapp-data-owner-gateway.zip',e='6676ff75b9a6a24d0f78181624685df60328b2b8ff69ee736bbfbbab2aaa9ca0',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
