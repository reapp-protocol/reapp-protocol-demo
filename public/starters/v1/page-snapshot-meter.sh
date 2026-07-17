#!/bin/sh
set -eu
archive='reapp-page-snapshot-meter.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/page-snapshot-meter.zip'
node -e "const f='reapp-page-snapshot-meter.zip',e='682fffc607fc6b4ed2a01a3e0dc25eac3e8cbf3a5405dee6b7c1c326c16642c4',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
