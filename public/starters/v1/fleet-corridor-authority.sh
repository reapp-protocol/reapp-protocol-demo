#!/bin/sh
set -eu
archive='reapp-fleet-corridor-authority.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/fleet-corridor-authority.zip'
node -e "const f='reapp-fleet-corridor-authority.zip',e='f988a029a7148307b62d138b4c95e2eca6399a7858f5884b015da5c794338b79',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
