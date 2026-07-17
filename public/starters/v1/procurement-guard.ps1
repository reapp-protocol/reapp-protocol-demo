$ErrorActionPreference = 'Stop'
$archive = 'reapp-procurement-guard.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/procurement-guard.zip' -OutFile $archive
  node -e "const f='reapp-procurement-guard.zip',e='3077d15df93bdf51cabb2e4b67a88831f9b7e3665ce98875754991d4a88bce68',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
