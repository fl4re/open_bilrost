/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _error_outputs = require('../../lib/errors')("Subscription");

class Subscription {
    constructor (workspace, id, type, descriptor) {
        this.workspace = workspace;
        this.id = id;
        this.type = type;
        this.descriptor = descriptor;
    }

    validate_descriptor () {
        return Promise.reject(_error_outputs.INTERNALERROR("Method not implemented."));
    }

    validate_dependencies () {
        return Promise.reject(_error_outputs.INTERNALERROR("Method not implemented."));
    }

    list_assets () {
        return Promise.reject(_error_outputs.INTERNALERROR("Method not implemented."));
    }

    list_dependencies () {
        return Promise.reject(_error_outputs.INTERNALERROR("Method not implemented."));
    }

    pull_dependencies () {
        const pull_dependency = ref => {
            const resource_path = this.workspace.utilities.ref_to_relative_path(ref);
            let resource_access, identity_access;
            const identity_path = this.workspace.utilities.resource_ref_to_identity_path(ref);
            return Promise.all([
                this.workspace.adapter.access(resource_path).then(() => { resource_access = true; }, () => {}),
                this.workspace.adapter.access(identity_path).then(() => { identity_access = true; }, () => {})
            ])
                .then(() => {
                    if (!resource_access && identity_access) {
                        return this.workspace.resource.repo_manager.pull_file(resource_path);
                    }
                });
        };
        return this.list_dependencies()
            // These promises need to be run sequentially due to git limitations,
            // hence the use of dependencies.reduce
            .then(dependencies => dependencies.reduce((p, ref) => p.then(() => pull_dependency(ref)), Promise.resolve()))
            .catch(err => {
                throw _error_outputs.INTERNALERROR(err);
            });
    }
}

Subscription.ASSET = "ASSET";
Subscription.NAMESPACE = "NAMESPACE";
Subscription.SEARCH = "SEARCH";

module.exports = Subscription;
