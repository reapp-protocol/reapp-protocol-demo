#!/bin/sh
set -eu
archive='reapp-procurement-guard.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/procurement-guard.zip'
node -e "const f='reapp-procurement-guard.zip',e='79c56daaabf0738abf768644ac555bcaf8fa665b5666be8ccf21a7849bea9e5d',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
