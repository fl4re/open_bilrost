/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const path = require('path');

const utilities = require('../utilities');
const errors = require('../../lib/errors')('S3 repo manager');
const amazon_s3 = require('../../lib/amazon-s3');

// this is will be deprecated

const filter_error = err => {
    let error = {};
    if (err instanceof Error) {
        error = errors.INTERNALERROR(err.toString());
    } else {
        error = errors.INTERNALERROR(err);
    }
    throw error;
};

const Repo_manager_s3 = input => {
    const cwd = input.cwd;
    const context = input.context;
    const identity = input.identity;
    const subscription_manager = input.subscription_manager;
    const amazon = amazon_s3(context.amazon_client, context.cache);
    return {
        type: 's3',
        get_commit_log: () => Promise.resolve([]),
        get_status: () => Promise.all(subscription_manager.get_subscription_objects().map(sub => sub.list_dependencies()))
            .then(utilities.flatten)
            .then(utilities.unique)
            .then(subs => {
                const statuses = [];
                return subs.reduce((sequence, sub_ref) => sequence
                    .then(() => identity.compare(sub_ref))
                    .then(is_unchanged => {
                        if (!is_unchanged) {
                            statuses.push({
                                ref: sub_ref,
                                path: input.utilities.ref_to_relative_path(sub_ref),
                                status: 'MODIFIED'
                            });
                        }
                    }, err => {
                        if (err.code === 1) {
                            statuses.push({
                                ref: sub_ref,
                                path: input.utilities.ref_to_relative_path(sub_ref),
                                status: 'NEW'
                            });
                        } else if (err.code === 2) {
                            statuses.push({
                                ref: sub_ref,
                                path: input.utilities.ref_to_relative_path(sub_ref),
                                status: 'DELETED'
                            });
                        } else {
                            throw err;
                        }
                    }), Promise.resolve()).then(() => statuses);
            }),
        pull_file: file_path => {
            const ref = input.utilities.relative_path_to_ref(file_path, cwd);
            const full_path = path.join(cwd, file_path);
            return identity.list(ref)
                .then(id => id.get_hash())
                .then(key => amazon.download(key, full_path))
                .catch(filter_error);
        },
        push_files: (mod_paths, add_paths) => {
            const push_file = relative_path => {
                const ref = input.utilities.relative_path_to_ref(relative_path);
                const absolute_path = path.join(cwd, relative_path);
                return identity.list(ref)
                    .then(id => id.get_hash())
                    .then(key => amazon.exists(key)
                        .then(() => {
                            // eslint-disable-next-line no-console
                            console.log(ref + ' already exists in s3 storage');
                        }, () => amazon.upload(absolute_path, key)
                            .then(uploader => uploader.start())));
            };
            const files_to_push = mod_paths.concat(add_paths);
            return files_to_push.reduce((sequence_of_promises, file_relative_path, index) => {
                return sequence_of_promises
                    .then(() => {
                        // eslint-disable-next-line no-console
                        console.log('Uploading ' + (index + 1) + '/' + files_to_push.length + ' resource...');
                        // eslint-disable-next-line no-console
                        console.log('Resource name: ' + file_relative_path);
                    })
                    .then(() => push_file(file_relative_path))
                    .then(() => {
                        // eslint-disable-next-line no-console
                        console.log((index + 1) + '/' + files_to_push.length + ' upload(s) done!');
                    });
            }, Promise.resolve()).catch(filter_error);
        }
    };
};

module.exports = Repo_manager_s3;
