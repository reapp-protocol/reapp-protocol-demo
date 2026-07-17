#!/bin/sh
set -eu
archive='reapp-paid-tool-gateway.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/paid-tool-gateway.zip'
node -e "const f='reapp-paid-tool-gateway.zip',e='c9b29a043abeccb1bf63fccd583bdc870fcd0b6d3ee44668536ad36b605438a0',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
