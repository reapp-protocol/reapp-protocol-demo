$ErrorActionPreference = 'Stop'
$archive = 'reapp-carbon-aware-run-window.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/carbon-aware-run-window.zip' -OutFile $archive
  node -e "const f='reapp-carbon-aware-run-window.zip',e='bedad7fe62f1462c32df8db0221d035d90e55cc19111924ea28006b1abf27993',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
