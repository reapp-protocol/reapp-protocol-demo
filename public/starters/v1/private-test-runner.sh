#!/bin/sh
set -eu
archive='reapp-private-test-runner.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/private-test-runner.zip'
node -e "const f='reapp-private-test-runner.zip',e='80a747fdb98d7f2af8d3f1c1d7094fb42be9dbe54f72990e91d1efd8be68447b',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
