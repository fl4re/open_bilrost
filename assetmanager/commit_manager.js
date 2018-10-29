/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const utilities = require('./utilities');
const _error_outputs = require('../lib/errors')("Commit manager");
const status_config = require('./status.config.json');

const commit_manager = (workspace, repo_manager, asset_finder, asset_reader) => {

    const get_commitable_files = () => {
        let add_paths = [];
        let mod_paths = [];
        let del_paths = [];

        const add_path_to_result = status => {
            if(status.status === status_config.sync.NEW) {
                add_paths.push(status.path);
            } else if (status.status === status_config.sync.DELETED) {
                del_paths.push(status.path);
            } else {
                mod_paths.push(status.path);
            }
        };

        return repo_manager.get_status()
            .then(statuses => {
                return workspace.stage_manager.get_stage().reduce((p, ref, index) => {
                    if (!index) {
                        p = Promise.resolve();
                    }
                    const is_asset = workspace.utilities.is_asset_ref(ref);
                    if (is_asset) {
                        return p
                            .then(() => asset_finder(ref))
                            .catch(error => {
                                if (error.statusCode === 404) {
                                    return asset_reader(ref, { rev: 'HEAD' })
                                        .then(content => ({
                                            output: content
                                        }));
                                } else {
                                    throw error;
                                }
                            })
                            .then(asset => {
                                statuses.forEach(status => {
                                    if (status.status === status_config.sync.DELETED) {
                                        if (repo_manager.type === 'git' ? status.ref === ref : workspace.utilities.is_dependency(status.ref, asset.output.main, asset.output.dependencies)) {
                                            del_paths.push(status.path);
                                        }
                                    } else if (status.status === status_config.sync.NEW || status.status === status_config.sync.MODIFIED || status.status === status_config.sync.RENAMED) {
                                        if (workspace.utilities.is_asset_ref(status.ref)) {
                                            if (utilities.includes(ref, status.ref)) {
                                                add_path_to_result(status);
                                            }
                                        } else {
                                            if (workspace.utilities.is_dependency(status.ref, asset.output.main, asset.output.dependencies)) {
                                                add_path_to_result(status);
                                            }
                                        }
                                    }
                                });
                            });
                    } else {
                        statuses.find(status => status.ref === ref)
                            .forEach(add_path_to_result);
                    }
                }, Promise.resolve());
            })
            .then(() => ({
                add_paths: utilities.unique(add_paths),
                mod_paths: utilities.unique(mod_paths),
                del_paths: utilities.unique(del_paths)
            }));
    };

    const commit_and_push = (message, commit_files) => {
        const lazy_get_commitable_files = () => new Promise((resolve, reject) => {
            if (commit_files) {
                resolve(commit_files);
            } else {
                get_commitable_files()
                    .then(commitable_files => {
                        resolve(commitable_files);
                    })
                    .catch(reject);
            }
        });
        return lazy_get_commitable_files()
            .then(commitable_files => repo_manager.push_files(commitable_files.mod_paths, commitable_files.add_paths, commitable_files.del_paths, message, workspace.get_branch()));
    };

    const get_commit_log = (ref, start_at_revision, maxResults) => {
        var file_path = workspace.utilities.ref_to_relative_path(ref);
        if (ref && !file_path) {
            throw _error_outputs.INTERNALERROR('Asset/Resource ref is not valid.');
        }
        return repo_manager.get_commit_log(file_path, start_at_revision, maxResults);
    };

    return {
        get_commitable_files,
        get_commit_log,
        commit_and_push
    };
};

module.exports = commit_manager;
