$ErrorActionPreference = 'Stop'
$archive = 'reapp-compute-broker.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/compute-broker.zip' -OutFile $archive
  node -e "const f='reapp-compute-broker.zip',e='5a33b3556edaab1d03e944a572a11fb26af741a54e28d6bc68281bb75b8ebaa4',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
