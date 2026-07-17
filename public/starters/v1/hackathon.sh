#!/bin/sh
set -eu
archive='reapp-hackathon.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/hackathon.zip'
node -e "const f='reapp-hackathon.zip',e='38925624c91af578b57f384c567a320fb88c7dfd6286d104c89173ec5b884bac',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
