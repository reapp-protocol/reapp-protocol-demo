$ErrorActionPreference = 'Stop'
$archive = 'reapp-agent-reputation-snapshot.zip'
try {
  Invoke-WebRequest -Uri 'https://reapp.live/starters/v1/agent-reputation-snapshot.zip' -OutFile $archive
  node -e "const f='reapp-agent-reputation-snapshot.zip',e='672111afd5c717de49dcbec9d73675b107abdb264f8dcd86490f292a46e02abc',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
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
