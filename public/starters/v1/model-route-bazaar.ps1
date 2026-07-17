$ErrorActionPreference = 'Stop'
$archive = 'reapp-model-route-bazaar.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/model-route-bazaar.zip' -OutFile $archive
  node -e "const f='reapp-model-route-bazaar.zip',e='e6f4cb722c1c07e866ec9529d545b020b0a5fc615eb0641c14f308aef30c8faa',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
