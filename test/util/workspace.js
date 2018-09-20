/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const exec = require('child_process').exec;
const _path = require('path').posix;
const fs = require('fs-extra');

const workspace_resource_presenter = require('./workspace_resource_presenter');
const asset_presenter = require('./asset_presenter');
const get_project_resource = require('./project_resource_presenter');
const get_github_project = require('./github_repository_presenter');

const internal_folder_name = '.bilrost';
const get_internal_file = path => _path.join(internal_folder_name, path ? path : '/');
const utilities = require('../../assetmanager/workspace_utilities')(get_internal_file);
const favorite = require('../../assetmanager/favorite')();

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

module.exports = (name, fixture) => {
    const get_name = () => name;
    const get_path = () => _path.join(fixture.get_path(), get_name());
    const get_internal_path = relative => _path.join(get_path(), get_internal_file(relative));
    const get_file_uri = () => path_to_file_uri(get_path());
    const add_to_favorite_list = () => favorite.add({
        name: get_name(),
        file_uri: get_file_uri()
    });
    const remove_from_favorite_list = () => favorite.remove(get_name());
    const create = async branch => {
        await fixture.create();
        await git_checkout(get_name(), get_github_project().ssh_url, fixture.get_path(), branch);
    };
    const remove = async () => {
        await fixture.remove();
        await remove_from_favorite_list();
    };
    const get_worskpace_resource = () => workspace_resource_presenter(get_name(), get_file_uri());
    const create_workspace_resource = () => fs.outputJson(get_internal_path('workspace'), get_worskpace_resource());
    const create_project_resource = () => fs.outputJson(get_internal_path('project'), get_project_resource());
    const create_asset = asset => fs.outputJson(utilities.ref_to_absolute_path(asset.meta.ref, get_path()), asset_presenter(asset));
    return {
        get_name,
        create,
        remove,
        create_workspace_resource,
        create_project_resource,
        create_asset,
        add_to_favorite_list,
        remove_from_favorite_list
    };
};
