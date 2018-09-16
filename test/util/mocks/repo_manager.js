/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const sinon = require('sinon');
const status_config = require('../../../assetmanager/status.config.json');

class Repo_manager {
    constructor (cwd) {
        this.cwd = cwd;

        let current_status_del_paths = [
            { status: status_config.sync.DELETED, ref: '/assets/test_1_1_0.level', path: '/.bilrost/assets/test_1_1_0.level' }
        ];

        this.current_status_callback = sinon.stub();
        this.current_status_callback.returns([]);
        this.current_status_callback.onCall(1).returns(current_status_del_paths);
        this.current_status_callback.onCall(2).returns(current_status_del_paths);

        this.push_files_callback = sinon.stub();
        this.push_files_callback.returns('47');
    }

    get_commit_id () {
        return Promise.resolve('50');
    }

    get_diff () {
        return Promise.resolve();
    }

    get_status_and_untracked_files_content () {
        return Promise.resolve();
    }

    get_commit_asset_status (old_revision, new_revision) {
        var callback = sinon.stub();

        callback.withArgs('10', '11')
            .onCall(0).returns({"A":[], "M":[], "D":[]})
            .onCall(1).returns({"A":[], "M":[], "D":[]});

        callback.withArgs('11', '10').throws("TypeError");

        return Promise.resolve(callback(old_revision, new_revision));
    }

    validate_vcs () {
        return Promise.resolve();
    }

    get_status () {
        return Promise.resolve(this.current_status_callback());
    }

    create_and_populate_workspace () {
        return Promise.resolve();
    }

    pull_file () {
        return Promise.resolve();
    }

    push_files () {
        return Promise.resolve(this.push_files_callback());
    }
}

module.exports = Repo_manager;
