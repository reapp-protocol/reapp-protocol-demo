#!/bin/sh
set -eu
archive='reapp-coding-agent-purchase-hook.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/coding-agent-purchase-hook.zip'
node -e "const f='reapp-coding-agent-purchase-hook.zip',e='627ea39b5c2272c69347a6420e6740f06cd69e00d77dda720680498235da6447',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
