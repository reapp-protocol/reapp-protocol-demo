#!/bin/sh
set -eu
archive='reapp-model-route-bazaar.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/model-route-bazaar.zip'
node -e "const f='reapp-model-route-bazaar.zip',e='e8797a5929a148c2150c3b88c308c962a48a40677cc42fcd8da6b39d5134da64',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
