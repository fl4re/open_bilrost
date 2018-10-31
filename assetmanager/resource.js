/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// to remove as soon as assets are managed by git
const asset = require('./asset');
const repo_manager = require('./repo_manager');
const IFS = require('../ifs/services');
const errors = require('../lib/errors')('Resource');
const commit_manager = require('./commit_manager');
const identity_manager = require('./identity');
const validator = require('./validator/resource');

const files_to_ignore = [
    ".svn",
    ".git",
    ".gitignore",
    ".bilrost"
];

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
                            $regex: ref
                        }
                    },
                    {
                        main: {
                            $regex: ref
                        }
                    }
                ]
        });
        return search_results.items
            .map(({ meta, main }) => ({
                ref: meta.ref,
                type: main === ref ? 'main' : 'dependency'
            }));
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

    const find_from_fs = async (ref, query) => {
        const path = workspace.utilities.ref_to_relative_path(ref);
        try {
            return await IFS.search_query(adapter, path, query, files_to_ignore);
        } catch (err) {
            if (err.toString().includes('ENOENT')) {
                throw errors.NOTFOUND(err);
            } else {
                throw errors.INTERNALERROR(err);
            }
        }
    };

    const get_from_fs = async ref => {
        if (!ref) {
            ref = "/resources/";
        }
        const path = workspace.utilities.ref_to_relative_path(ref);
        try {
            return await IFS.get_stats(adapter, path, files_to_ignore);
        } catch (err) {
            if (err === "Not found" || err.toString().includes('ENOENT')) {
                throw errors.NOTFOUND(path);
            } else if (err === "Not support") {
                throw errors.FILETYPENOTSUPPORTED();
            } else {
                throw errors.INTERNALERROR(err);
            }
        }
    };

    const format_resource_item = async (identity_item, fs_item) => {
        const assets = await list_assets(identity_item.ref);
        return {
            ...fs_item,
            ...identity_item,
            assets
        };
    };

    const format_resource_items = async (identity_items, fs_items) => Promise.all(identity_items.map(async identity_item => {
        const associated_fs_item = fs_items.find(({ path }) => path === identity_item.path) || {};
        const assets = await list_assets(identity_item.ref);
        return {
            ...identity_item,
            ...associated_fs_item,
            assets
        };
    }));

    const get = async ref => {
        try {
            const [identity_res, ifs_res] = await Promise.all([
                identity.list(ref),
                get_from_fs(ref)
                    .catch(err => {
                        if (err.statusCode !== 404) {
                            throw errors.INTERNALERROR(err);
                        } else {
                            return { items: [] };
                        }
                    })
            ]);
            if (identity_res.items) {
                identity_res.items = await format_resource_items(identity_res.items, ifs_res.items);
                return identity_res;
            } else {
                return await format_resource_item(identity_res, ifs_res);
            }
        } catch (err) {
            throw err.statusCode ? err : errors.INTERNALERROR(err);
        }
    };

    const find = async (ref, query) => {
        try {
            const [identity_res, ifs_res] = await Promise.all([
                identity.find(ref, query),
                find_from_fs(ref, query)
                    .catch(err => {
                        if (!err.message.includes('ENOENT')) {
                            throw err;
                        }
                    })
            ]);
            identity_res.items = await format_resource_items(identity_res.items, ifs_res.items);
            return identity_res;
        } catch (err) {
            throw err.statusCode ? err : errors.INTERNALERROR(err);
        }
    };

    return {
        get,
        find,
        commit_manager: commit_manager(workspace, resource_repo_manager, asset_finder, asset_reader),
        validator: validator(workspace.adapter, workspace.utilities),
        repo_manager: resource_repo_manager,
        identity
    };
};
