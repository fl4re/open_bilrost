#!/usr/bin/env bash

# Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.

set -e
# This script is intended to be run by Jenkins,
# it must be run setting the following Env Variables:
# * image
# * node_version
# * JOB_BASE_NAME, set by Jenkins
# * BUILD_ID, set by Jenkins


# This section create the docker image that includes the app code.
# The image is named after the jenkins job and build id.

echo "
FROM ${image}:${node_version}
COPY . /app/
RUN cp ~/.npmrc /app/
RUN git config --global --add bilrost.protocol ssh
RUN echo \"https://$GITHUB_USERNAME:$GITHUB_PASSWORD@github.com\" > ~/.git-credentials
RUN git config --global credential.helper store
RUN npm install
CMD [\"npm\", \"test\"]
" > Dockerfile

DOCKER_IMAGE=${JOB_BASE_NAME}:${BUILD_ID}
docker build -q -t ${DOCKER_IMAGE} .
rm -f Dockerfile


# This section actually runs the tests and cleans up.
# Note that a docker volume is mounted to retrieve the reports (xunit, coverage, etc).

docker run --rm ${DOCKER_IMAGE} jshint . --exclude ./node_modules
mkdir -p reports
docker run --rm -v ${WORKSPACE}/reports:/app/reports ${DOCKER_IMAGE} npm run jenkins

docker rmi ${DOCKER_IMAGE}
