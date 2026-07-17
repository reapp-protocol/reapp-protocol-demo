$ErrorActionPreference = 'Stop'
$archive = 'reapp-service-bazaar.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/service-bazaar.zip' -OutFile $archive
  node -e "const f='reapp-service-bazaar.zip',e='9d51dd3924bcd26e3c571cb2a1c783a4eb1110be95dc1e5fa0e758e59de144ea',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
