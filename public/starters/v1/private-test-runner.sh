#!/bin/sh
set -eu
archive='reapp-private-test-runner.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/private-test-runner.zip'
node -e "const f='reapp-private-test-runner.zip',e='af4206e413dfc6e0f33038520c7bfa4c941a2775f565a03f1a3a11d428c0ba16',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
