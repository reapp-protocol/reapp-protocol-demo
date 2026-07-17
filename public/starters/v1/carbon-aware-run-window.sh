#!/bin/sh
set -eu
archive='reapp-carbon-aware-run-window.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/carbon-aware-run-window.zip'
node -e "const f='reapp-carbon-aware-run-window.zip',e='bedad7fe62f1462c32df8db0221d035d90e55cc19111924ea28006b1abf27993',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
