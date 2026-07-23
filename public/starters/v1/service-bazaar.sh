#!/bin/sh
set -eu
archive='reapp-service-bazaar.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/service-bazaar.zip'
node -e "const f='reapp-service-bazaar.zip',e='b62ebe2ffc4f0bdb1c6c9808062371d1d4a5229f3413d40a53d8c8dae67820fb',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
