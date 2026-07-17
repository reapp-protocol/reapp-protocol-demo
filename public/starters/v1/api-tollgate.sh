#!/bin/sh
set -eu
archive='reapp-api-tollgate.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/api-tollgate.zip'
node -e "const f='reapp-api-tollgate.zip',e='0aacb00c3c2db56cecd4fd6efaa89225cc97ea31e01cd1c1e765f8e159e36f72',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
