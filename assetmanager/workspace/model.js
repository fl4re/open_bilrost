/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";

const utilities = require('../utilities');

// to move progressively here and finally deprecate
const Workspace = require('./Workspace');

const _error_outputs = require('../lib/errors')("Workspace");

let workspace_locks = [];
const add_to_lock = file_uri => {
    workspace_locks.push(file_uri);
};
const remove_from_lock = file_uri => {
    const index = workspace_locks.indexOf(file_uri);
    workspace_locks.splice(index, 1);
};
const is_locked = file_uri => workspace_locks.find(lock_uri => lock_uri === file_uri);

module.exports = (ifs_adapter, properties, project, branch, context) => {

    Object.assign(new Workspace(ifs_adapter.file_uri, context), {
        project: {
            full_name: project.get_full_name(),
            host: project.get_host_vcs()
        },
        ifs_adapter,
        branch,
        name: properties.name,
        guid: properties.guid,
        description: properties.description,
        version: properties.version,
        pushed_at: properties.pushed_at,
        created_at: properties.created_at,
        updated_at: properties.updated_at,
        type: properties.type,
        subscriptions: properties.subscriptions,
        stage: properties.stage,
        statuses: properties.statuses,
        tags: properties.tags,
        absolute_path: utilities.convert_file_uri_to_path(),
        add_to_lock: () => add_to_lock(ifs_adapter.file_uri),
        remove_from_lock: () => remove_from_lock(ifs_adapter.file_uri),
        check_is_locked: () => is_locked(ifs_adapter.file_uri),
        with_lock: () => callback => {
            const is_locked = this.check_is_locked(ifs_adapter.file_uri);
            if (!is_locked) {
                this.add_to_lock(ifs_adapter.file_uri);
                return callback();
            } else {
                throw _error_outputs.RESTRICTED(`${properties.name}`, 'workspace is locked');
            }
        }
    });
};
