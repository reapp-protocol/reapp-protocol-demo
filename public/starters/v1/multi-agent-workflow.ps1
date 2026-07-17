$ErrorActionPreference = 'Stop'
$archive = 'reapp-multi-agent-workflow.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/multi-agent-workflow.zip' -OutFile $archive
  node -e "const f='reapp-multi-agent-workflow.zip',e='5101480692c61358c67142399dcfee3f5fdcda911999e93aa195f11a088090cb',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
