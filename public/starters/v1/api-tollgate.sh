#!/bin/sh
set -eu
archive='reapp-api-tollgate.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/api-tollgate.zip'
node -e "const f='reapp-api-tollgate.zip',e='611ae64141d255a95fc06f82323d9dbcb9920f89dd1468c99f8a83c0a53090fd',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
