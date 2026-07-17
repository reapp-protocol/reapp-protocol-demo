$ErrorActionPreference = 'Stop'
$archive = 'reapp-data-owner-gateway.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/data-owner-gateway.zip' -OutFile $archive
  node -e "const f='reapp-data-owner-gateway.zip',e='3b2665b99121a0f3d302512cf8f239bb039bbbb22d3745c39f3e11ef03598484',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
