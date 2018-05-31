/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Status = require('../status');
const AssetValidator = require('./validator/asset');
const WorkspaceValidator = require('./validator/workspace');
const status_config = require('./status.config.json');

const map_states_to_descriptions = status_config.map_states_to_descriptions;

class Status_am extends Status {

    constructor (ref, status_collection) {
        super(ref, map_states_to_descriptions);
        this.collection = status_collection;
        this.sync_from_database();
    }

    sync_from_database () {
        return this.collection
            .get(this.get_ref())
            .then(status => {
                if (status) {
                    this.status = status;
                    return true;
                } else {
                    this.set_state(status_config.integrity.DELETED);
                    return this.save_status();
                }
            });
    }

    save_status () {
        return this.collection
            .get(this.get_ref())
            .then(status => {
                if (status) {
                    return this.collection.update(this.get_ref(), this.get());
                } else {
                    return this.collection.add(this.get());
                }
            });
    }

}

class Workspace extends Status_am {

    constructor (workspace) {
        super("workspace_validator", workspace.status_collection);
        this.validator = new WorkspaceValidator(workspace.adapter, workspace.get_internal_file_path);
    }

    run () {
        this.remove_info("error");
        this.set_state(status_config.integrity.PENDING);
        return this.save_status()
            .then(() => this.validator.run_workspace_validation())
            .then(
                () => this.set_state(status_config.integrity.VALID),
                (validator) => {
                    this.set_state(status_config.integrity.INVALID);
                    this.set_info("error", validator.error);
                })
            .then(() => this.save_status());
    }

}

class Asset extends Status_am {

    constructor (workspace) {
        super("assets_validator", workspace.status_collection);
        this.validator = new AssetValidator(workspace);
    }

    run () {
        this.set_state(status_config.integrity.PENDING);
        this.remove_info("assets");
        return Promise.all([
            this.save_status(),
            this.validator.run_bare_validation('/assets/', { recursive: true })
        ])
            .then(promises_output => {
                let validations = promises_output[1];
                let errors = validations.filter(item => item.error)
                    .map(item => {
                        let result = {};
                        result[item.ref] = item.error;
                        return result;
                    });
                if (errors.length) {
                    this.set_state(status_config.integrity.INVALID);
                    this.set_info("assets", errors);
                    return this.save_status();
                }
                this.set_state(status_config.integrity.VALID);
                return this.save_status();
            })
            .catch(error => {
                this.set_state(status_config.integrity.INVALID);
                this.set_info("error", error);
                this.save_status();
                throw error;
            });
    }

}

module.exports = {
    Workspace : Workspace,
    Asset : Asset
};
