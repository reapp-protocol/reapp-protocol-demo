$ErrorActionPreference = 'Stop'
$archive = 'reapp-research-source-scout.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/research-source-scout.zip' -OutFile $archive
  node -e "const f='reapp-research-source-scout.zip',e='1ab02072b1179e16e3e07dd02dbe132e3945a12fc5093d99373bd3bb6b73482e',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
