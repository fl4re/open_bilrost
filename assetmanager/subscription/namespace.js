/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Asset = require('../asset');

const Subscription = require('./common');
const utilities = require('../utilities');

const _error_outputs = require('../../lib/errors')("Namespace subscription");

class Namespace_subscription extends Subscription {
    constructor (workspace, id, descriptor) {
        super(workspace, id, Subscription.NAMESPACE, descriptor);
    }
    
    validate_descriptor () {
        return new Promise((resolve, reject) => {
            if (this.workspace.utilities.is_asset_namespace(this.descriptor)) {
                resolve(this.workspace);
            } else {
                reject(_error_outputs.INTERNALERROR("Invalid Namespace"));
            }
        });
    }
    
    validate_dependencies () {
        return this.workspace.asset.validator.run_full_validation(this.descriptor)
            .then(result => {
                if (result.error) {
                   throw _error_outputs.INTERNALERROR(result.error);
                }
                result.forEach(item => {
                    if (item.error) {
                        throw _error_outputs.INTERNALERROR(item.error);
                    }
                });
            })
            .then(() => this.workspace);
    }
    
    list_assets () {
        return Asset.find_asset_by_ref(this.workspace, this.descriptor)
            .then(assets_results => assets_results.output.items)
            .catch(err => { throw _error_outputs.INTERNALERROR(err); });
    }
    
    list_dependencies () {
        const workspace = this.workspace;
        return this.list_assets()
            .then(assets => {
                let dependencies = [];
                
                // These promises need to be run sequentially due to git limitations,
                // hence the use of dependencies.reduce
                return assets.reduce(function(p, a) {
                    return p.then(() => {
                        return Asset.find_asset_by_ref(workspace, a.meta.ref)
                            .then(asset => {
                                if (asset.output.main) {
                                    dependencies.push(asset.output.main);
                                }
                                asset.output.dependencies.forEach(dependency_ref => {
                                    dependencies.push(dependency_ref);
                                });
                                return asset.output.dependencies;
                            });
                    });
                }, Promise.resolve())
                    .then(() => dependencies);
            })
            .then(dependencies => utilities.unique(dependencies))
            .catch(err => { throw _error_outputs.INTERNALERROR(err); });
    }
    
}

module.exports = Namespace_subscription;
