#!/bin/sh
set -eu
archive='reapp-research-source-scout.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/research-source-scout.zip'
node -e "const f='reapp-research-source-scout.zip',e='1ab02072b1179e16e3e07dd02dbe132e3945a12fc5093d99373bd3bb6b73482e',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
