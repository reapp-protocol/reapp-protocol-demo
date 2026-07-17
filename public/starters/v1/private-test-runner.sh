#!/bin/sh
set -eu
archive='reapp-private-test-runner.zip'
cleanup() { rm -f "$archive"; }
trap cleanup EXIT HUP INT TERM
curl -fsSLo "$archive" 'https://reapp.live/starters/v1/private-test-runner.zip'
node -e "const f='reapp-private-test-runner.zip',e='56b22a3b3b4ef2922e37870152e84762a509766fb3b67d3ee8b0d0c0fc6cf6d1',s=require('node:fs'),a=require('node:crypto').createHash('sha256').update(s.readFileSync(f)).digest('hex');if(a!==e){s.rmSync(f);throw Error('Starter integrity check failed')}"
unzip -q "$archive"
rm -f "$archive"
npm ci
printf '\nREAPP starter installed. Run: npm run demo\n'
