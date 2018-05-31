#!/usr/bin/env bash

# Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.

# This script is intended to be run by Jenkins,
# it must be run setting the following Env Variables:
#   AWS_S3_CREDENTIALS, is the file that contains the S3 credentials
node --version
npm --version

echo "setting S3 config file"
mkdir -p config
cp -f $AWS_S3_CREDENTIALS config/

npm install
npm run jshint
npm run jenkins
