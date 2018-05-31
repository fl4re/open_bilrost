/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Asset = require('../asset');
const utilities = require('../utilities');

const Subscription = require('./common');

const _error_outputs = require('../../lib/errors')("Asset subscription");

class Asset_subscription extends Subscription {
    constructor (workspace, id, descriptor) {
        super(workspace, id, Subscription.ASSET, descriptor);
    }
    
    validate_descriptor () {
        return new Promise((resolve, reject) => {
            if (!this.workspace.utilities.is_asset_and_not_namespace(this.descriptor)) {
                reject(_error_outputs.INTERNALERROR("Invalid Asset ref"));
            } else {
                resolve(this.workspace);
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
            .then(asset => asset.output, error => {
                if (error.statusCode === 404) {
                    return this.workspace.asset.repo_manager.read(this.descriptor, { rev: 'HEAD' })
                        .catch(err => { throw _error_outputs.CORRUPT(this.descriptor + ' element from subscription list'); });
                }
            });
    }
    
    list_dependencies () {
        let dependencies = [];
        
        return this.list_assets()
            .then(asset => {
                if (asset.main) {
                    dependencies.push(asset.main);
                }
                
                asset.dependencies.forEach(dependency_ref => {
                    dependencies.push(dependency_ref);
                });
                
                return dependencies;
            })
            .then(() => utilities.unique(dependencies))
            .catch(err => { throw _error_outputs.INTERNALERROR(err); });
    }
    
}

module.exports = Asset_subscription;
