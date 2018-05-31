/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _error_outputs = require('../lib/errors')("Stage manager");

class Stage_manager {
    constructor (workspace) {
        this.workspace = workspace;
        this.stage = [];

        this.workspace.properties.stage.forEach(asset_ref => {
            this.stage.push(asset_ref);
        });
    }

    get_stage () {
        return this.stage.slice(0);
    }

    empty_stage () {
        this.stage = [];
    }

    add_asset (asset_ref) {
        if (!this.workspace.utilities.is_asset_and_not_namespace(asset_ref)) {
            throw _error_outputs.INTERNALERROR("Invalid Asset ref");
        }

        const is_exist = this.stage.find(item => item === asset_ref);

        if (!is_exist) {
            return this.workspace.subscription_manager.is_subscribed(asset_ref)
                .then(is_subs => {
                    if (is_subs) {
                        this.stage.push(asset_ref);
                    } else {
                        throw _error_outputs.INTERNALERROR("Asset ref is not under any Subscription.");
                    }
                });
        } else {
            return Promise.resolve();
        }
    }

    remove_asset (asset_ref) {
        let asset_response;
        let asset_index;

        this.stage.forEach((asset, index) => {
            if (asset.ref === asset_ref) {
                asset_index = index;
            }
        });

        if (asset_index !== -1) {
            asset_response = this.stage[asset_index];
            this.stage.splice(asset_index, 1);
            return asset_response;
        }
    }
}

module.exports = Stage_manager;
