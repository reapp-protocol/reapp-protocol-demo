#!/bin/sh
set -eu
archive='reapp-human-review-outbox.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/human-review-outbox.zip'
node -e "const f='reapp-human-review-outbox.zip',e='45326c608e52453cfa4059ccde357890af50ebf1b2a8301f7396d93162de30b9',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
