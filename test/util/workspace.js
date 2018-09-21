/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const crypto = require('crypto');
const exec = require('child_process').exec;
const _path = require('path').posix;
const fs = require('fs-extra');

// const ifs = require('../../ifs/adapters');
const asset_collection = require('../../assetmanager/databases/assets_collection');
const workspace_resource_presenter = require('./workspace_resource_presenter');
const asset_presenter = require('./asset_presenter');
const get_project_resource = require('./project_resource_presenter');
const get_github_project = require('./github_repository_presenter');

const internal_folder_name = '.bilrost';
const get_internal_file = path => _path.join(internal_folder_name, path ? path : '/');
const utilities = require('../../assetmanager/workspace_utilities')(get_internal_file);

const is_win = /^win/.test(process.platform);

const path_to_file_uri = path => `file://${is_win ? '/' : ''}${path}`;

const git_checkout = (name, url, path, branch_name) => new Promise((resolve, reject) => {
    exec(`git clone -b ${branch_name} ${url} ${name}`, { cwd: path }, error => {
        if (error) {
            reject(error);
        } else {
            resolve();
        }
    });
});

const local_checkout = (branch, dest) => {
    const src = _path.join(__dirname.replace(/\\/g, '/'), '..', 'fixtures', branch);
    return fs.copy(src, dest);
};

module.exports = (name, fixture) => {
    const guid = crypto.randomBytes(20).toString('hex');

    const get_guid = () => guid;
    const get_name = () => name;
    const get_path = () => _path.join(fixture.get_path(), get_name());
    const get_internal_path = relative => _path.join(get_path(), get_internal_file(relative));
    const get_file_uri = () => path_to_file_uri(get_path());
    const get_encoded_file_uri = () => encodeURIComponent(get_file_uri());
    const create = async branch => {
        await fixture.create();
        await git_checkout(get_name(), get_github_project().ssh_url, fixture.get_path(), branch);
        await local_checkout(branch, get_path());
    };
    const remove = async () => {
        await fixture.remove();
    };
    const get_worskpace_resource = () => workspace_resource_presenter(get_name(), get_file_uri(), get_guid());
    const create_workspace_resource = () => fs.outputJson(get_internal_path('workspace'), get_worskpace_resource());
    const create_project_resource = () => fs.outputJson(get_internal_path('project'), get_project_resource());
    const format_asset = (subset = {}) => asset_presenter(subset);
    const create_asset = asset => {
        const absolute_path = utilities.ref_to_absolute_path(asset.meta.ref, get_path());
        asset = format_asset(asset);
        fs.outputJsonSync(absolute_path, asset);
        return asset;
    };
    const read_asset = ref => fs.readJsonSync(utilities.ref_to_absolute_path(ref, get_path()));
    const remove_asset = ref => fs.removeSync(utilities.ref_to_absolute_path(ref, get_path()));
    const create_resource = relative => fs.outputFile(_path.join(get_path(), relative));
    const remove_resource = relative => fs.removeSync(_path.join(get_path(), relative));
    // const instance_adapter = () => ifs.set(get_guid(), { path: get_path(), type: 'local' });
    const instance_database = async () => {
        const asset_db = await asset_collection(get_guid());
        return asset_db;
    };
    return {
        get_name,
        get_encoded_file_uri,
        get_internal_path,
        create,
        remove,
        create_workspace_resource,
        create_project_resource,
        format_asset,
        create_asset,
        read_asset,
        remove_asset,
        create_resource,
        remove_resource,
        instance_database
    };
};
