#!/bin/sh
set -eu
archive='reapp-compute-broker.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/compute-broker.zip'
node -e "const f='reapp-compute-broker.zip',e='00ad5b3179b7842553bef9c37ccc657370af3dae6096121f443ea1d615eff570',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
