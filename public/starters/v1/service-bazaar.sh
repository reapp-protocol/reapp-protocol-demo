#!/bin/sh
set -eu
archive='reapp-service-bazaar.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/service-bazaar.zip'
node -e "const f='reapp-service-bazaar.zip',e='9d51dd3924bcd26e3c571cb2a1c783a4eb1110be95dc1e5fa0e758e59de144ea',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
