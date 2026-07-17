$ErrorActionPreference = 'Stop'
$archive = 'reapp-human-review-outbox.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/human-review-outbox.zip' -OutFile $archive
  node -e "const f='reapp-human-review-outbox.zip',e='c2c2418ba9e4ae176a26dc3c5beb4d1e6c03a431856cc5f22d791f6469c9225b',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
