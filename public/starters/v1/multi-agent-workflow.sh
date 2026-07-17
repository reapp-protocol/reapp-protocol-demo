#!/bin/sh
set -eu
archive='reapp-multi-agent-workflow.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/multi-agent-workflow.zip'
node -e "const f='reapp-multi-agent-workflow.zip',e='5101480692c61358c67142399dcfee3f5fdcda911999e93aa195f11a088090cb',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
