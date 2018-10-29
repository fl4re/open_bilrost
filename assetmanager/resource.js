/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// to remove as soon as assets are managed by git
const asset = require('./asset');

const repo_manager = require('./repo_manager');
const IFS = require('../ifs/services');
const ifs_util = require('../ifs/utilities');
const errors = require('../lib/errors')('Resource');
const config = require('./resource.config.json');
const commit_manager = require('./commit_manager');
const identity_manager = require('./identity');
const mime = require('mime');
const validator = require('./validator/resource');

mime.define(config.mime);

module.exports = workspace => {
    const adapter = workspace.get_adapter();
    const asset_repo_manager = repo_manager.create({
        host_vcs: 'git',
        cwd: adapter.path,
        utilities: workspace.utilities
    });
    const list_assets = async ref => {
        const search_results = await workspace.database.search({
            '$or':
                [
                    {
                        dependencies: {
                            '$contains': ref
                        }
                    },
                    {
                        main : ref
                    }
                ]
        });
        return search_results.items.map(asset => asset.meta.ref);
    };
    const identity = identity_manager(adapter, asset_repo_manager, workspace.utilities, list_assets);
    const resource_repo_manager = repo_manager.create({
        host_vcs: workspace.project.get_host_vcs(),
        cwd: adapter.path,
        context: workspace.get_context(),
        subscription_manager: workspace.subscription_manager,
        identity,
        utilities: workspace.utilities
    });
    const asset_finder = (ref, options) => asset.find_asset_by_ref(workspace, ref, options);
    const asset_reader = (ref, options) => asset_repo_manager.read(ref, options);

    const get = async (ref, options) => {
        if (!options) {
            options = {};
        }
        if (!options.start) {
            options.start = 0;
        }
        if (!options.maxResults) {
            options.maxResults = 100;
        }
        if (!ref) {
            ref = "/resources/";
        }
        let path = workspace.utilities.ref_to_relative_path(ref);
        try {
            let result;
            if (options.q) {
                result = await IFS.search_query(adapter, path, options.q);
            } else {
                result = await IFS.get_stats(adapter, path);
            }
            if (result.kind === "file-list") {
                result.items = result.items.filter(file => !~config.ignore.indexOf(file.name));
                if (options.filterName) {
                    result.items = ifs_util.filter_name(result.items, options.filterName);
                }
                let total = result.items.length;
                result.items = ifs_util.slice(result.items, options.start, options.maxResults);
                result.items = result.items.map(item => {
                    item = ifs_util.format_file(item);
                    item.ref = workspace.utilities.absolute_path_to_ref(item.path, adapter.path);
                    return item;
                });
                if (options.start + result.items.length < total) {
                    var indexOfMoreResults = options.start + options.maxResults;
                }
                result.totalItems = total;
            } else if (
                !result.kind && !~config.ignore.indexOf(result.name)
            ) {
                let header = {
                    'Last-Modified': result.mtime,
                    'ETag': result.mtime.getTime().toString() + result.ino + result.size
                };
                result = ifs_util.format_file(result);
                result.ref = workspace.utilities.absolute_path_to_ref(result.path, adapter.path);
                result.header = header;
            } else {
                throw "error";
            }
            return {
                indexOfMoreResults,
                output: result
            };
        } catch (err) {
            console.log(err);
            switch (err) {
            case "Not found":
                throw errors.NOTFOUND(path);
            case "Not support":
                throw errors.FILETYPENOTSUPPORTED();
            default:
                throw errors.INTERNALERROR(err);
            }
        }
    };
    return {
        get,
        commit_manager: commit_manager(workspace, resource_repo_manager, asset_finder, asset_reader),
        validator: validator(workspace.adapter, workspace.utilities),
        repo_manager: resource_repo_manager
    };
};
