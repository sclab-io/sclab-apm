#!/bin/bash
echo "RUN SCLAB APM"
./node_modules/.bin/pm2 start ecosystem.config.js --only prod