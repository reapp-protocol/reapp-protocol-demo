$ErrorActionPreference = 'Stop'
$archive = 'reapp-human-review-outbox.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/human-review-outbox.zip' -OutFile $archive
  node -e "const f='reapp-human-review-outbox.zip',e='af6f03381e405031ab254f3661148c119db60c5c4be2b8414cd8c5f83729393c',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
