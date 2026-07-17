#!/bin/sh
set -eu
archive='reapp-page-snapshot-meter.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/page-snapshot-meter.zip'
node -e "const f='reapp-page-snapshot-meter.zip',e='d24456b662c98e2e2ad35f7420b909b58d4cffaee2d2ef1aa135bab6762065ab',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
