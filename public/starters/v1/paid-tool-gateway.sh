#!/bin/sh
set -eu
archive='reapp-paid-tool-gateway.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/paid-tool-gateway.zip'
node -e "const f='reapp-paid-tool-gateway.zip',e='920770ed191ee1c2bb64daa2bf87f659308d0eb1d1bcbd54d482561419a2889a',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
