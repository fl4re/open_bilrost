/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Subscription_presenter = require('./subscription_presenter').Subscription_metadata_presenter;
const Subscription_factory = require('./subscription_factory');

const utilities = require('./utilities');
const _error_outputs = require('../lib/errors')("Subscription manager");

class Subscription_manager {
    constructor (workspace) {
        this.workspace = workspace;
        this.subscriptions = [];

        this.workspace.properties.subscriptions.forEach(item => {
            let subscription = Subscription_factory.create(workspace, item.id, item.type, item.descriptor);
            subscription.validate_descriptor()
                .then(() => {
                    this.subscriptions.push(subscription);
                });
        });
    }

    get_subscription_objects () {
        return this.subscriptions;
    }

    get_subscriptions () {
        let subscriptions = this.subscriptions.map(subscription => Subscription_presenter.present(subscription, this.workspace.properties));
        return subscriptions;
    }

    get_assets () {
        return Promise.all(this.subscriptions.map(subscription => subscription.list_assets()))
            .then(asset_lists => {
                let assets = utilities.flatten(asset_lists);
                return utilities.unique(assets);
            });
    }

    is_subscribed (ref) {
        return this.get_assets()
            .then(assets => {
                let result = false;

                assets.forEach(asset => {
                    result = result || asset.meta.ref === ref || asset.main === ref;

                    if (asset.dependencies) {
                        asset.dependencies.forEach(dependency => {
                            result = result || dependency === ref;
                        });
                    }
                });

                return result;
            });
    }

    validate_dependencies () {
        return Promise.all(this.subscriptions.map(subscription => subscription.validate_dependencies()));
    }

    add_subscription (type, descriptor) {
        return this.is_subscribed(descriptor)
            .then(is_subbed => {
                if (!is_subbed) {
                    let s_id = Subscription_factory.generate_guid();
                    let subscription = Subscription_factory.create(this.workspace, s_id, type, descriptor);
                    return subscription.validate_descriptor()
                        .then(() => subscription.pull_dependencies())
                        .then(() => subscription.validate_dependencies())
                        .then(() => this.subscriptions.push(subscription))
                        .then(() => Subscription_presenter.present(subscription, this.workspace.properties))
                        .catch(err => {
                            throw _error_outputs.INTERNALERROR(err);
                        });
                } else {
                    return this.get_subscriptions()
                        .find(sub => sub.type === type && sub.descriptor === descriptor);
                }
            });
    }

    remove_subscription (subscription_id) {
        this.subscriptions.forEach((item, index) => {
            if (item.id === subscription_id) {
                this.subscriptions.splice(index, 1);
            }
        });
    }

    remove_all_subscriptions () {
        this.subscriptions = [];
    }

}

module.exports = Subscription_manager;
