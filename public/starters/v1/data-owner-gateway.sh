#!/bin/sh
set -eu
archive='reapp-data-owner-gateway.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/data-owner-gateway.zip'
node -e "const f='reapp-data-owner-gateway.zip',e='6676ff75b9a6a24d0f78181624685df60328b2b8ff69ee736bbfbbab2aaa9ca0',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
