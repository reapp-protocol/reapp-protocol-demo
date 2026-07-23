$ErrorActionPreference = 'Stop'
$archive = 'reapp-research-source-scout.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/research-source-scout.zip' -OutFile $archive
  node -e "const f='reapp-research-source-scout.zip',e='af72f9fecc2321cacebae5edeafdda1c5c4ce68dd738ee77ff7e666059407aec',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
