#!/bin/sh
set -eu
archive='reapp-fleet-corridor-authority.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/fleet-corridor-authority.zip'
node -e "const f='reapp-fleet-corridor-authority.zip',e='ecb42f55725383241e77a2f7be7fd57846ca68f39de8d2f8f8aeea42e11355e5',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
