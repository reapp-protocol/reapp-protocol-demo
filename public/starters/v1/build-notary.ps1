$ErrorActionPreference = 'Stop'
$archive = 'reapp-build-notary.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/build-notary.zip' -OutFile $archive
  node -e "const f='reapp-build-notary.zip',e='1d418801d98f05b8489326ff5df4988f537c4b5d6fbec9572ec3a7d1b72ce3fe',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
