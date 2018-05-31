#!/usr/bin/env bash

# Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.

set -e
if [ ! -v FL4RE_PUBLISH_BRANCH ]; then
  echo "FL4RE_PUBLISH_BRANCH must be set, exiting."
  exit 1
fi
echo "This is to be only called from Jenkins to publish npm module"
git rev-parse --is-inside-work-tree
git_branch=`git branch | awk '/^\*/ {print $2}'`
if [[ ${git_branch} == 'master' ]]; then
  echo "Can not publish patch in master branch"
  exit 1
fi

tagged_version=`npm --no-git-tag-version version patch`
echo ${tagged_version}

# First commit to github and then publish. If we do the opposite and the git push fails
# the npm has been published and the git commit is lost. Leaving the system in an unrecoverable
# state and needing a manual intervention to force unpublish the npm version.
# With first git and then publish, if any of the steps fail the github repo and the npm registry
# are always in good state. It may happen that there is a version committed that was never published.
git add package.json npm-shrinkwrap.json
git commit -m "${tagged_version}"
git tag -a ${tagged_version} -m "${tagged_version}"
git push origin HEAD:${FL4RE_PUBLISH_BRANCH}
git push origin tag ${tagged_version}

