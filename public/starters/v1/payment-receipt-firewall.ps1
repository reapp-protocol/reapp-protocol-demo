$ErrorActionPreference = 'Stop'
$archive = 'reapp-payment-receipt-firewall.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/payment-receipt-firewall.zip' -OutFile $archive
  node -e "const f='reapp-payment-receipt-firewall.zip',e='67396fcbde0b2d439ff5deea8ed387151cf3ccaeb99d3a1aae1686f5ce80a292',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
