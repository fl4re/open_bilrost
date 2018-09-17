/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const integrity_status = require('./integrity_status');
const General_status = require('../status');
const errors = require('../lib/errors')("Status manager");

const status_config = require('./status.config.json');
const map_states_to_priorities = status_config.map_states_to_priorities;

function Status_manager (workspace) {
    let workspace_adapter = workspace.adapter;
    let workspace_host_vcs = workspace.project.get_host_vcs();
    if (!workspace_host_vcs) {
        this.error = errors.INTERNALERROR("Workspace host version control is unknown");
        throw this;
    }

    this.adapter = workspace_adapter;
    this.asset_repo_manager = workspace.asset.repo_manager;
    this.resource_repo_manager = workspace.resource.repo_manager;
    this.status = [
        new integrity_status.Asset(workspace),
        new integrity_status.Workspace(workspace)
    ];

    this.general_status = new General_status('general');

    this.get_statuses = () => this.status;

    this.get_status = ref => this.get_statuses().find(status => status.get_ref() === ref);

    this.update_and_retrieve_status = () => this.sync_all_status_from_database().then(() => this.get_statuses());

    this.sync_all_status_from_database = () => Promise.all(this.get_statuses().map(status => status.sync_from_database()));

    this.get_general_status = () => this.sync_all_status_from_database()
        .then(() => {
            this.general_status.set_state(status_config.integrity.VALID);
            let result_priority = map_states_to_priorities[this.general_status.get_state()];
            this.get_statuses()
                .forEach(item => {
                    let current_priority = map_states_to_priorities[item.get_state()];
                    if (current_priority > result_priority) {
                        this.general_status.set_state(item.get_state());
                        this.general_status.set_info('guilty_ref', item.get_ref());
                        this.general_status.set_info('guilty_info', item.get_info());
                        result_priority = current_priority;
                    }
                });
            return this.general_status;
        });

    this.run_all_status = () => Promise.all(this.get_statuses().map(status => status.run()));

    this.check_overall_validation = () => this.asset_repo_manager.validate_vcs()
        .then(() => this.sync_all_status_from_database())
        .then(() => this.run_all_status())
        .then(() => {
            const invalid_status_list = this.get_statuses()
                .filter(status => status.get_state() !== status_config.integrity.VALID);
            if (invalid_status_list.length) {
                throw errors.INTERNALERROR(JSON.stringify(invalid_status_list.map(status => status.status.info)));
            }
        });

    return this;
}

module.exports = Status_manager;
