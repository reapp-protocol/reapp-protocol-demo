#!/bin/sh
set -eu
archive='reapp-build-notary.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/build-notary.zip'
node -e "const f='reapp-build-notary.zip',e='6dc8584ffcf88f3d40565a6c52b3ef238127644fdfc2c1a277845c76c0f5cdb7',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
