#!/bin/sh
set -eu
archive='reapp-data-owner-gateway.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/data-owner-gateway.zip'
node -e "const f='reapp-data-owner-gateway.zip',e='3b2665b99121a0f3d302512cf8f239bb039bbbb22d3745c39f3e11ef03598484',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
