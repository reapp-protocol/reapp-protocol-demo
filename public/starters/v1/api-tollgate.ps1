$ErrorActionPreference = 'Stop'
$archive = 'reapp-api-tollgate.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/api-tollgate.zip' -OutFile $archive
  node -e "const f='reapp-api-tollgate.zip',e='611ae64141d255a95fc06f82323d9dbcb9920f89dd1468c99f8a83c0a53090fd',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
