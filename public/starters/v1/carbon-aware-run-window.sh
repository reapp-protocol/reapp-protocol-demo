#!/bin/sh
set -eu
archive='reapp-carbon-aware-run-window.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/carbon-aware-run-window.zip'
node -e "const f='reapp-carbon-aware-run-window.zip',e='3d7cea0679aecb890240955e08545234200391f2bf9d1bb170a1b1094150fd69',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
