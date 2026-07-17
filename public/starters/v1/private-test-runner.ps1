$ErrorActionPreference = 'Stop'
$archive = 'reapp-private-test-runner.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/private-test-runner.zip' -OutFile $archive
  node -e "const f='reapp-private-test-runner.zip',e='80a747fdb98d7f2af8d3f1c1d7094fb42be9dbe54f72990e91d1efd8be68447b',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
