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
                            '$contains': ref
                        }
                    },
                    {
                        main: ref
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

    const format_items = items => items
        .filter(file => !files_to_ignore.find(ignore_entry => file.path.includes(ignore_entry)))
        .map(item => {
            item = ifs_util.format_file(item);
            item.ref = workspace.utilities.absolute_path_to_ref(item.path, adapter.path);
            return item;
        });

    const find_from_fs = async (ref, query) => {
        const path = workspace.utilities.ref_to_relative_path(ref);
        try {
            const result = await IFS.search_query(adapter, path, query);
            result.items = format_items(result.items);
            return result;
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
            let result = await IFS.get_stats(adapter, path);
            if (result.kind === "file-list") {
                result.items = format_items(result.items);
            } else if (
                !result.kind && !~files_to_ignore.indexOf(result.name)
            ) {
                const modified = result.mtime;
                const etag = modified.getTime().toString() + result.ino + result.size;
                result = ifs_util.format_file(result);
                result.ref = workspace.utilities.absolute_path_to_ref(result.path, adapter.path);
                result.modified = modified;
                result.etag = etag;
            } else {
                throw errors.INTERNALERROR('Unvalid ifs output');
            }
            return result;
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

    const get_from_db = async ref => {
        let ident = {}, assets;
        try {
            ident.hash = await identity.get_resource_hash(ref);
        } catch (err) {
            const message = err.message || err.toString();
            const is_message_to_ignore = message.includes('ENOENT') || message.includes('EISDIR');
            if (!is_message_to_ignore) {
                throw errors.INTERNALERROR(err);
            }
        }
        try {
            assets = await list_assets(ref);
        } catch (err) {
            throw errors.INTERNALERROR(err);
        }
        return {
            assets,
            ...ident
        };
    };

    const get = async ref => {
        try {
            const file_system_res = await get_from_fs(ref);
            if (file_system_res.items) {
                file_system_res.items = await Promise.all(file_system_res.items.map(async item => {
                    const db_res = await get_from_db(item.ref);
                    return {
                        ...item,
                        ...db_res
                    };
                }));
                return file_system_res;
            } else {
                const db_res = await get_from_db(ref);
                return {
                    ...file_system_res,
                    ...db_res
                };
            }
        } catch (err) {
            throw err.statusCode ? err : errors.INTERNALERROR(err);
        }
    };

    const find = async (ref, query) => {
        try {
            const file_system_res = await find_from_fs(ref, query);
            file_system_res.items = await Promise.all(file_system_res.items.map(async item => {
                const db_res = await get_from_db(item.ref);
                return {
                    ...item,
                    ...db_res
                };
            }));
            return file_system_res;
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
