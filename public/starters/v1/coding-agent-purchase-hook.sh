#!/bin/sh
set -eu
archive='reapp-coding-agent-purchase-hook.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/coding-agent-purchase-hook.zip'
node -e "const f='reapp-coding-agent-purchase-hook.zip',e='ed460c5923482767f8b2c7a15b58fccfa01f9ed821ef0b882c5ec9a2258d8465',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
