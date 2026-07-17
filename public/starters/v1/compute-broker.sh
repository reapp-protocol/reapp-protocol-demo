#!/bin/sh
set -eu
archive='reapp-compute-broker.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/compute-broker.zip'
node -e "const f='reapp-compute-broker.zip',e='eeb440570a82dfa1c0c44228a54665ac63ebee2bc28efb0c57edb087fa276fb7',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
