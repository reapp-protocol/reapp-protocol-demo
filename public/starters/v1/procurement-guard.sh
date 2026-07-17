#!/bin/sh
set -eu
archive='reapp-procurement-guard.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/procurement-guard.zip'
node -e "const f='reapp-procurement-guard.zip',e='3077d15df93bdf51cabb2e4b67a88831f9b7e3665ce98875754991d4a88bce68',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
