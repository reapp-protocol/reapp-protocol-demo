#!/bin/sh
set -eu
archive='reapp-build-notary.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/build-notary.zip'
node -e "const f='reapp-build-notary.zip',e='add688e13ecfaf8a7d51fad86da0ada6a7bbb9a264022b23a30cb0e5cefad069',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
