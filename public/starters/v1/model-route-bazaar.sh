#!/bin/sh
set -eu
archive='reapp-model-route-bazaar.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/model-route-bazaar.zip'
node -e "const f='reapp-model-route-bazaar.zip',e='4e2634ee75883e9691c14d0365dd0bbd2dfb4ad69a1f50e3ad4d815467f731b3',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
