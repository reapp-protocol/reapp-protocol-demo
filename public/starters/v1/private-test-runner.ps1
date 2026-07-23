$ErrorActionPreference = 'Stop'
$archive = 'reapp-private-test-runner.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/private-test-runner.zip' -OutFile $archive
  node -e "const f='reapp-private-test-runner.zip',e='af4206e413dfc6e0f33038520c7bfa4c941a2775f565a03f1a3a11d428c0ba16',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
