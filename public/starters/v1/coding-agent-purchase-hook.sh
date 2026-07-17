#!/bin/sh
set -eu
archive='reapp-coding-agent-purchase-hook.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/coding-agent-purchase-hook.zip'
node -e "const f='reapp-coding-agent-purchase-hook.zip',e='a8a8bb4c2c46e21ebef9c3aa5f85deba8d59d95fb409cf4b6b0b657c9bf8c0cf',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
