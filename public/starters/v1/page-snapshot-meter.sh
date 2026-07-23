#!/bin/sh
set -eu
archive='reapp-page-snapshot-meter.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/page-snapshot-meter.zip'
node -e "const f='reapp-page-snapshot-meter.zip',e='7619c46e76076b5bf3409ef97dbb2debc790115b2a9a46fce785e06bda6f8ccd',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
