$ErrorActionPreference = 'Stop'
$archive = 'reapp-fleet-corridor-authority.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/fleet-corridor-authority.zip' -OutFile $archive
  node -e "const f='reapp-fleet-corridor-authority.zip',e='ecb42f55725383241e77a2f7be7fd57846ca68f39de8d2f8f8aeea42e11355e5',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
