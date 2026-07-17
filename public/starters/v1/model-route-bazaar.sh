#!/bin/sh
set -eu
archive='reapp-model-route-bazaar.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/model-route-bazaar.zip'
node -e "const f='reapp-model-route-bazaar.zip',e='e6f4cb722c1c07e866ec9529d545b020b0a5fc615eb0641c14f308aef30c8faa',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
