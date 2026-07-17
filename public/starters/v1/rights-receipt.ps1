$ErrorActionPreference = 'Stop'
$archive = 'reapp-rights-receipt.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/rights-receipt.zip' -OutFile $archive
  node -e "const f='reapp-rights-receipt.zip',e='e196d3b5e4bebf484f239fc5d868e5d75670493ee21bee2366fde6cfeaee5664',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
