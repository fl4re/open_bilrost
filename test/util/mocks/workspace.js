/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const path = require('path');

const assets_collection = require('../../../assetmanager/databases/assets_collection');
const status_collection = require('../../../assetmanager/databases/status_collection');
const Status_manager = require('../../../assetmanager/status_manager');
const workspace_utilities = require('../../../assetmanager/workspace_utilities');
const asset = require('../../../assetmanager/asset');
const Resource = require('../../../assetmanager/resource');
const mock_ifs_adapter = require('./ifs_adapter');

module.exports = (guid, worskpace_path, host_vcs, ifs_map, branch, adapter) => {
    this.get_internal_file_path = p => path.join('.bilrost', p ? p : '/');
    this.utilities = workspace_utilities(this.get_internal_file_path);
    this.adapter = adapter ? adapter : mock_ifs_adapter(worskpace_path, ifs_map);
    this.get_adapter = () => this.adapter;
    this.get_encoded_file_uri = () => worskpace_path;
    this.project = {
        get_host_vcs: () => host_vcs
    };
    this.get_context = () => ({
        amazon_client: {},
        cache: {}
    });
    this.get_branch = () => branch;
    this.get_guid = () => guid;
    this.save = () => Promise.resolve();
    this.update_stage = () => Promise.resolve();
    this.update_subscriptions = () => Promise.resolve();
    this.database = assets_collection(guid);
    this.status_collection = status_collection(guid);
    this.resource = new Resource(this);
    this.asset = asset(this);
    this.status_manager = new Status_manager(this);
    return Promise.resolve(this);
};
