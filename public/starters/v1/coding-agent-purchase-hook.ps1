$ErrorActionPreference = 'Stop'
$archive = 'reapp-coding-agent-purchase-hook.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/coding-agent-purchase-hook.zip' -OutFile $archive
  node -e "const f='reapp-coding-agent-purchase-hook.zip',e='a8a8bb4c2c46e21ebef9c3aa5f85deba8d59d95fb409cf4b6b0b657c9bf8c0cf',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
