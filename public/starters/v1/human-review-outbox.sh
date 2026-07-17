#!/bin/sh
set -eu
archive='reapp-human-review-outbox.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/human-review-outbox.zip'
node -e "const f='reapp-human-review-outbox.zip',e='af6f03381e405031ab254f3661148c119db60c5c4be2b8414cd8c5f83729393c',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
