/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    Workspace manager for content browser
    version 2.0.0
 */
'use strict';

const fs = require('fs-extra');
const _path = require('path').posix;
const minimatch = require('minimatch');

const utilities = require('./utilities');
const adapters = require('../ifs/adapters');
const branch_model = require('./branch');
const asset = require('./asset');
const Resource = require("./resource");
const assets_collection = require('./databases/assets_collection');
const status_collection = require('./databases/status_collection');
const Subscription_manager = require('./subscription_manager');
const Stage_manager = require('./stage_manager');
const Workspace_factory = require('./workspace_factory');
const project_factory = require('./project_factory');
const Status_manager = require('./status_manager');
const repo_manager = require('./repo_manager');

const _error_outputs = require('../lib/errors')("Workspace");
const status_config = require('./status.config.json');
const workspace_utilities = require('./workspace_utilities');
const favorite = require('./favorite')();

const WORKSPACE_INTERNAL_FOLDER_PATH = '.bilrost';

const transform_error = err => {
    this.error = _error_outputs.INTERNALERROR(err);
    throw this;
};

let workspace_locks = [];
const add_to_lock = file_uri => {
    workspace_locks.push(file_uri);
};
const remove_from_lock = file_uri => {
    const index = workspace_locks.indexOf(file_uri);
    workspace_locks.splice(index, 1);
};
const is_locked = file_uri => workspace_locks.find(lock_uri => lock_uri === file_uri);

let database_semaphores = {};

const Workspace = function Workspace (file_uri, context, options) {
    if (!file_uri) {
        throw new Error('Cannot instantiate a Workspace without an file uri');
    }
    const include_workspace_with_errors = options && options.include_error;

    this.get_file_uri = () => file_uri;
    this.get_base_absolute_path = () => utilities.convert_file_uri_to_path(this.get_file_uri());
    this.get_name = () => this.properties.name;
    this.get_guid = () => this.properties.guid;
    this.get_branch = () => this.branch_name;
    this.get_context = () => context;
    this.get_rest3d_client = () => context.rest3d_client;
    this.get_internal_folder_name = () => WORKSPACE_INTERNAL_FOLDER_PATH;
    this.get_internal_file_path = path => _path.join(this.get_internal_folder_name(), path ? path : '/');
    this.get_internal_absolute_path = () => _path.join(this.get_base_absolute_path(), this.get_internal_folder_name());
    this.check_is_locked = () => is_locked(this.get_file_uri());
    this.add_to_lock = () => add_to_lock(this.get_file_uri());
    this.remove_from_lock = () => remove_from_lock(this.get_file_uri());
    this.with_lock = callback => {
        const is_locked = this.check_is_locked();
        if (!is_locked) {
            this.add_to_lock();
            return callback();
        } else {
            throw _error_outputs.RESTRICTED(`${this.get_name()}`, 'workspace is locked');
        }
    };

    this.utilities = workspace_utilities(this.get_internal_file_path);

    let result = {
        is_valid: true
    };
    const workspace = favorite.find_by_file_uri(file_uri);
    if (workspace) {
        if (workspace.status) {
            workspace.status.forEach(status => {
                if (status.state !== status_config.integrity.VALID) {
                    result.reason = status.info;
                    result.is_valid = false;
                }
            });
        }
    }

    this.status = result;

    const create_ifs_adapter = () => {
        if (fs.existsSync(this.get_internal_absolute_path())) {
            return adapters.set(Math.random().toString(), { type: 'local', path: this.get_base_absolute_path() })
                .then(adapter => {
                    this.adapter = adapter;
                }).catch(err => {
                    this.error = _error_outputs.NOTFOUND(err);
                    throw this;
                });
        } else {
            this.error = _error_outputs.NOTFOUND(`${this.get_file_uri()} not found`);
            return Promise.reject(this);
        }

    };

    const get_current_branch = () => {
        const git_repo_manager = repo_manager.create({
            host_vcs: 'git',
            cwd: this.adapter.path
        });
        const branch_manager = branch_model(git_repo_manager);
        return branch_manager.get_name()
            .then(branch => {
                this.branch_name = branch;
            });
    };

    const instantiate_branch_manager = () => {
        const git_repo_manager = repo_manager.create({
            host_vcs: 'git',
            cwd: this.adapter.path
        });
        this.branch = branch_model(git_repo_manager, this.reset.bind(this));
    };

    const read_workspace_properties = () => {
        return this.adapter.readJson(this.get_internal_file_path('workspace'))
            .then(workspace_resource => {
                this.properties = workspace_resource;

                if (!this.properties.subscriptions) {
                    this.properties.subscriptions = [];
                }

                if (!this.properties.stage) {
                    this.properties.stage = [];
                }

                // add other metadata to the resource
                this.properties.resources_url = "/contentbrowser/workspaces/" + this.get_guid() + "/resources/";
                this.properties.assets_url = "/contentbrowser/workspaces/" + this.get_guid() + "/assets/";
            }, err => {
                this.error = _error_outputs.NOTFOUND(err);
                throw this;
            });
    };

    const read_project_properties = () => {
        return project_factory.get_project(this)
            .then(project => this.project = project);
    };

    const build_database = () => {
        this.database = assets_collection(this.get_guid());
        this.status_collection = status_collection(this.get_guid());
        if (!database_semaphores[file_uri]) {
            database_semaphores[file_uri] = this.populate_db();
        }
        return database_semaphores[file_uri];
    };

    const check_invalid_status = () => {
        if (!this.status.is_valid) {
            this.error = _error_outputs.RESTRICTED("Invalid workspace", JSON.stringify(this.status.reason));
            throw this;
        }
    };

    const instantiate_status_manager = () => {
        this.status_manager = new Status_manager(this);
    };

    const instantiate_subscription_manager = () => {
        this.subscription_manager = new Subscription_manager(this);
    };

    const instantiate_stage_manager = () => {
        this.stage_manager = new Stage_manager(this);
    };

    const instantiate_asset = () => {
        this.asset = asset(this);
    };

    const instantiate_resource = () => {
        this.resource = new Resource(this);
    };

    this.populate_db = () => {
        if (!this.adapter) {
            throw new Error('Workspace not initialized. Missing adapter.');
        }
        if (!this.database) {
            throw new Error('Workspace not initialized. Missing database');
        }
        return this.adapter.getFilesRecursively(this.get_internal_file_path('assets'))
            .then(assets_path => Promise.all(assets_path.map(asset_path => this.adapter.readJson(asset_path))))
            .then(assets => this.database.add_batch(assets));
    };
    this.remove_database_semaphore = () => {
        delete database_semaphores[file_uri];
    };
    this.reset = () => this.adapter.getFilesRecursively('', ['.git', '.bilrost', '.gitignore'])
        .then(files => Promise.all(files.map(this.adapter.remove)))
        .then(this.remove_all_subscriptions)
        .then(this.empty_stage)
        .catch(transform_error);
    this.get_adapter = () => this.adapter;
    this.update_and_retrieve_status = () => this.status_manager.update_and_retrieve_status();
    this.get_general_status = () => this.status_manager.get_general_status();
    this.check_overall_validation = () => this.status_manager.check_overall_validation();
    this.get_status = () => {
        let workspace_status = {
            workspace_name: this.properties.name,
            workspace_guid: this.properties.guid,
            host_vcs: this.project.get_host_vcs(),
            statuses: [],
            integrity_status: undefined,
            sync_status: undefined
        };
        return Promise.all([
            this.resource.repo_manager.get_status(),
            this.asset.repo_manager.get_status()
        ])
            .then(sync_statuses => {
                const format = ({ status, ref }) => ({ status, ref });
                const resource_sync_status = sync_statuses[0];
                const asset_sync_status = sync_statuses[1];
                const statuses = [...resource_sync_status.filter(format), ...asset_sync_status.filter(format)];

                return Promise.all(statuses
                    .map(({ status, ref }) => {
                        let integrity_status = status === status_config.sync.DELETED ? status_config.sync.DELETED : status_config.sync.VALID;
                        integrity_status = status === status_config.sync.DELETED ? status_config.sync.DELETED : status_config.sync.VALID;
                        let ref_status = {
                            ref,
                            sync_status: status,
                            integrity_status
                        };
                        if (this.utilities.is_asset_ref(ref) && (status === 'MODIFIED' || status === 'NEW')) {
                            return this.asset.validator.run_full_validation(ref)
                                .then(result => {
                                    ref_status.integrity_status = result[0].state;
                                    return ref_status;
                                })
                                .catch(error => {
                                    throw _error_outputs.INTERNALERROR(error);
                                });
                        } else {
                            return ref_status;
                        }
                    })
                );
            })
            .then(statuses => {
                workspace_status.statuses = statuses;
                let is_modified = false;
                let is_out_of_date = false;

                statuses.forEach(({ status }) => {
                    if (status === status_config.sync.OUT_OF_DATE) {
                        is_out_of_date = true;
                    } else if (status !== status_config.sync.UP_TO_DATE) {
                        is_modified = true;
                    }
                });

                if (is_modified && is_out_of_date) {
                    workspace_status.sync_status = status_config.sync.CONFLICTED;
                } else if (is_modified) {
                    workspace_status.sync_status = status_config.sync.MODIFIED;
                } else if (is_out_of_date) {
                    workspace_status.sync_status = status_config.sync.OUT_OF_DATE;
                } else {
                    workspace_status.sync_status = status_config.sync.UP_TO_DATE;
                }
            })
            .then(() => this.status_manager.get_general_status())
            .then(general_status => {
                workspace_status.integrity_status = general_status.status.state;
                return workspace_status;
            });
    };
    this.get_ref_status = ref => {
        const ref_status = {
            sync_status: status_config.sync.UP_TO_DATE,
            integrity_status: status_config.integrity.VALID
        };
        const is_asset = this.utilities.is_asset_ref(ref);
        const repo_manager = is_asset ? this.asset.repo_manager : this.resource.repo_manager;
        return repo_manager.get_status()
            .then(statuses => statuses
                .filter(status => status.ref === ref)
                .map(({ status }) => {
                    ref_status.sync_status = status;
                }))
            .then(() => {
                if (this.utilities.is_asset_ref(ref) && (ref_status.sync_status === 'MODIFIED' || ref_status.sync_status === 'NEW')) {
                    return this.asset.validator.run_full_validation(ref)
                        .then(result => {
                            ref_status.integrity_status = result[0].state;
                            return ref_status;
                        })
                        .catch(error => {
                            throw _error_outputs.INTERNALERROR(error);
                        });
                } else {
                    return ref_status;
                }
            });
    };
    this.save = () => Workspace_factory.save(this.properties);
    this.get_subscriptions = () => this.subscription_manager.get_subscriptions();
    this.add_subscription = (type, descriptor) => this.with_lock(() => this.subscription_manager.add_subscription(type, descriptor)
        .then(subscription => {
            this.update_subscriptions();
            return this.save()
                .then(() => {
                    this.remove_from_lock();
                    return subscription;
                });
        }).catch(err => {
            this.remove_from_lock();
            throw err;
        }));
    this.remove_subscription = s_id => {
        this.subscription_manager.remove_subscription(s_id);
        this.update_subscriptions();
        return this.save();
    };
    this.remove_all_subscriptions = () => {
        this.subscription_manager.remove_all_subscriptions();
        this.update_subscriptions();
        return this.save();
    };
    this.update_subscriptions = () => {
        this.properties.subscriptions = this.subscription_manager.get_subscriptions();
    };
    this.get_stage = () => this.stage_manager.get_stage();
    this.get_staged_files = () => this.stage_manager.get_staged_files();
    this.add_asset_to_stage = asset_ref => this.stage_manager.add_asset(asset_ref)
        .then(() => {
            this.update_stage();
            return this.save();
        });
    this.remove_asset_from_stage = asset_ref => {
        this.stage_manager.remove_asset(asset_ref);
        this.update_stage();
        return this.save();
    };
    this.update_stage = () => {
        this.properties.stage = this.stage_manager.get_stage();
    };
    this.empty_stage = () => {
        this.stage_manager.empty_stage();
        this.update_stage();
        return this.save();
    };
    this.commit_files = message => this.with_lock(() => this.resource.commit_manager.get_commitable_files()
        .then(resource_commitable_files => {
            let resource_commit_id, asset_commit_id;
            return this.resource.identity.build_and_stage_identity_files(resource_commitable_files)
                .then(() => this.resource.commit_manager.commit_files(message, resource_commitable_files))
                .then(id => {
                    resource_commit_id = id;
                })
                .then(() => this.asset.commit_manager.commit_files(message))
                .then(id => {
                    asset_commit_id = id;
                    return this.empty_stage();
                })
                .then(() => {
                    const res = {
                        git: asset_commit_id
                    };
                    this.remove_from_lock();
                    return res;
                });
        })
        .catch(err => {
            this.remove_from_lock();
            throw err;
        }));
    this.get_commit_logs = (start_at_revision, maxResults) => {
        return Promise.all([
                this.resource.commit_manager.get_commit_log('', start_at_revision, maxResults),
                this.asset.commit_manager.get_commit_log('', start_at_revision, maxResults)
            ]).then(prom_res => {
                const resource_logs = prom_res[0];
                const asset_logs = prom_res[1];
                resource_logs.forEach((resource_log, index) => {
                    const asset_log = asset_logs[index];
                    asset_log.changed_paths = asset_log.changed_paths.concat(resource_log.changed_paths);
                });
                return asset_logs;
            });
    };
    this.get_commit_log = (ref, start_at_revision, maxResults) => {
        const is_asset = this.utilities.is_asset_ref(ref);
        let promises, format_asset_logs;
        if (is_asset) {
            promises = [this.asset.commit_manager.get_commit_log(ref, start_at_revision, maxResults)];
            format_asset_logs = prom_res => prom_res[0];
        } else {
            promises = [this.resource.commit_manager.get_commit_log(ref, start_at_revision, maxResults)];
            format_asset_logs = prom_res => prom_res[0];
        }
        return Promise.all(promises)
            .then(format_asset_logs);
    };

    return create_ifs_adapter()
        .then(get_current_branch)
        .then(read_project_properties)
        .then(read_workspace_properties)
        .then(build_database)
        .then(check_invalid_status)
        .then(instantiate_subscription_manager)
        .then(instantiate_stage_manager)
        .then(instantiate_branch_manager)
        .then(instantiate_resource)
        .then(instantiate_asset)
        .then(instantiate_status_manager)
        .then(() => this)
        .catch(err => {
            if (include_workspace_with_errors) {
                return this;
            } else {
                throw err;
            }
        });
};

module.exports = context => {

    const find_by_file_uri = file_uri => new Workspace(file_uri, context);

    const list = options => {
        if (!options) {
            options = {};
        }

        // retrieve all workspaces from favorite list, check if it is valid and returns the list of resources
        const favorite_list = favorite.list();
        const convert_to_resources = workspaces => workspaces
            .filter(workspace => workspace.status.is_valid);

        const filter_by_name = name => workspaces => {
            if (name) {
                return workspaces.filter(workspace => minimatch(workspace.properties.name || '', name || '*'));
            } else {
                return workspaces;
            }
        };

        return Promise.all(favorite_list.map(workspace => new Workspace(workspace.file_uri, context, {include_error: true})))
            .then(convert_to_resources)
            .then(filter_by_name(options.filterName))
            .catch(transform_error);
    };

    function find_by_identifiers(identifiers) {
        if (identifiers && identifiers.file_uri) {
            return find_by_file_uri(identifiers.file_uri);
        } else {
            return Promise.reject({error: _error_outputs.CORRUPT("Invalid workspace identifier")});
        }
    }

    const find = (identifier) => {
        let identifiers;
        if (typeof identifier === 'string') {
            identifiers = favorite.find(identifier);
        } else {
            throw _error_outputs.INTERNALERROR('Identifier is not under string format.');
        }
        return find_by_identifiers(identifiers);
    };

    return {
        list: list,
        find: find,
        find_by_file_uri: find_by_file_uri
    };

};
