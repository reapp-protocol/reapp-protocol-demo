#!/bin/sh
set -eu
archive='reapp-cold-chain-passport.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/cold-chain-passport.zip'
node -e "const f='reapp-cold-chain-passport.zip',e='8a9651c1e870f87231aa3d3cb477198103b75c9dca81f39973a25997fd10eb64',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
