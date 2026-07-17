#!/bin/sh
set -eu
archive='reapp-payment-receipt-firewall.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/payment-receipt-firewall.zip'
node -e "const f='reapp-payment-receipt-firewall.zip',e='67396fcbde0b2d439ff5deea8ed387151cf3ccaeb99d3a1aae1686f5ce80a292',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
