#!/bin/bash
echo "Start building SCLAB APM"
npm i
npm run build:release
echo "RUN SCLAB APM"
npx pm2 start ./build/src/main.js