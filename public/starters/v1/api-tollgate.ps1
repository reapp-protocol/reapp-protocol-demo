$ErrorActionPreference = 'Stop'
$archive = 'reapp-api-tollgate.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/api-tollgate.zip' -OutFile $archive
  node -e "const f='reapp-api-tollgate.zip',e='0aacb00c3c2db56cecd4fd6efaa89225cc97ea31e01cd1c1e765f8e159e36f72',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
