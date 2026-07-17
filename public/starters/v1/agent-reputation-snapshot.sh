#!/bin/sh
set -eu
archive='reapp-agent-reputation-snapshot.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/agent-reputation-snapshot.zip'
node -e "const f='reapp-agent-reputation-snapshot.zip',e='e17550a166993b72ade6bd9752f7a0a292ad03e7fb78e18661abbe847aa2830c',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
