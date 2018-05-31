/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Asset = require('../asset');

const Subscription = require('./common');
const utilities = require('../utilities');

const _error_outputs = require('../../lib/errors')("Search subscription");

class Search_subscription extends Subscription {
    constructor (workspace, id, descriptor) {
        super(workspace, id, Subscription.SEARCH, descriptor);
    }
    
    validate_descriptor () {
        return Asset.find_asset_by_ref(this.workspace, '/assets/', {q: this.descriptor})
            .then(result => {
                return Promise.resolve(this.workspace);
            })
            .catch(err => { throw _error_outputs.INTERNALERROR(err); });
    }
    
    validate_dependencies () {
        return Asset.find_asset_by_ref(this.workspace, '/assets/', {q: this.descriptor})
            .then(assets => {
                return Promise.all(assets.output.items.map(asset => {
                    return this.workspace.asset.validator.run_full_validation(asset.meta.ref)
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
                    }));
            })
            .catch(err => { throw _error_outputs.INTERNALERROR(err); });
    }
    
    list_assets () {
        return Asset.find_asset_by_ref(this.workspace, '/assets/', {q: this.descriptor})
            .then(assets_results => assets_results.output.items)
            .catch(err => { throw _error_outputs.INTERNALERROR(err); });
    }
    
    list_dependencies () {
        return this.list_assets()
            .then(assets => {
                let dependencies = [];
                
                // These promises need to be run sequentially due to git limitations,
                // hence the use of assets.reduce
                return assets.reduce(function(p, a) {
                    return p.then(() => {
                        return Asset.find_asset_by_ref(this.workspace, a.meta.ref)
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

module.exports = Search_subscription;
