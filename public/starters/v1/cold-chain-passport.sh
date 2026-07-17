#!/bin/sh
set -eu
archive='reapp-cold-chain-passport.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/cold-chain-passport.zip'
node -e "const f='reapp-cold-chain-passport.zip',e='c285d2616457f8d3ef7a39e46e93ceebba49dacf2f2a38edf64dcd094ce37569',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
