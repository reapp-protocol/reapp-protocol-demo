#!/bin/sh
set -eu
archive='reapp-data-owner-gateway.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/data-owner-gateway.zip'
node -e "const f='reapp-data-owner-gateway.zip',e='848fcf430ada6cccbbe075ed8250f618af06813723595c0028e412738942fcda',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
