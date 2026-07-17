$ErrorActionPreference = 'Stop'
$archive = 'reapp-hackathon.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/hackathon.zip' -OutFile $archive
  node -e "const f='reapp-hackathon.zip',e='38925624c91af578b57f384c567a320fb88c7dfd6286d104c89173ec5b884bac',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
