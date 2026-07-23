#!/bin/sh
set -eu
archive='reapp-build-notary.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/build-notary.zip'
node -e "const f='reapp-build-notary.zip',e='1d418801d98f05b8489326ff5df4988f537c4b5d6fbec9572ec3a7d1b72ce3fe',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
