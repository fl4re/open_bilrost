/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const errors = require('../../lib/errors')('Identity');
const IFS = require('../../ifs/services');
const model = require('./model');
const util = require('./util');

const handle_error = err => {
    throw errors.INTERNALERROR(err);
};

const ifs_ignores = ['.git'];

module.exports = (ifs_adapter, git_repo_manager, workspace_utilities, list_parent_assets) => {

    const identity_utilities = util(workspace_utilities);

    const instantiate_identity = async ({ path, kind, mime }) => {
        let hash;
        const ref = identity_utilities.identity_path_to_resource_ref(path);
        try {
            hash = (await ifs_adapter.readJson(path)).hash;
        } catch (err) {
            if (err.code === 'ENOENT' || err.code === 'EISDIR') {
                hash = '';
            } else {
                handle_error(err);
            }
        }
        return model(ref, kind, mime, hash);
    };

    const list = async (ref = '/resources/', query) => {
        const path = identity_utilities.resource_ref_to_identity_path(ref);
        try {
            let stats = query ? await IFS.search_query(ifs_adapter, path, query, ifs_ignores)
                : await IFS.get_stats(ifs_adapter, path, ifs_ignores);
            return await Promise.all(stats.map(instantiate_identity));
        } catch (err) {
            // TODO clean ifs error handlers
            if (err === "Not found" || err.code === 'ENOENT') {
                throw errors.NOTFOUND(path);
            } else if (err === "Not support") {
                throw errors.FILETYPENOTSUPPORTED();
            } else {
                throw errors.INTERNALERROR(err);
            }
        }
    };

    const get = async ref => {
        const identities = await list(ref);
        if (identities.length === 1) {
            return identities[0];
        } else {
            throw errors.INTERNALERROR(`${ref} points to more than one identity`);
        }
    };

    const find = async (ref, query) => list(ref, query);

    // compare the resource sha given by its content with the hash defined by identity files
    const compare = async ref => {
        let identity_hash, resource_hash;
        try {
            identity_hash = (await get(ref)).hash;
        } catch (err) {
            if (err.statusCode === 404) {
                throw {
                    code: 1 // no identity file
                };
            } else {
                handle_error(err);
            }
        }
        try {
            resource_hash = await build_hash(workspace_utilities.ref_to_relative_path(ref));
        } catch (err) {
            if (err.statusCode === 404) {
                throw {
                    code: 2 // no resource
                };
            } else {
                handle_error(err);
            }
        }
        return identity_hash === resource_hash;
    };

    const build_hash = path => ifs_adapter.build_hash(path)
        .catch(err => {
            if (err.code === 'ENOENT') {
                throw errors.NOTFOUND(path);
            } else {
                handle_error(err);
            }
        });

    const create = async path => {
        try {
            const hash = await build_hash(path);
            await ifs_adapter.outputFormattedJson(identity_utilities.resource_path_to_identity_path(path), { hash });
        } catch (err) {
            handle_error(err);
        }
    };

    const remove = async path => {
        const parents = await list_parent_assets(workspace_utilities.relative_path_to_ref(path));
        if (parents.length <= 1) {
            await ifs_adapter.removeFile(identity_utilities.resource_path_to_identity_path(path));
        }
    };

    // to move elsewhere
    const build_and_stage_identity_files = resource_commitable_files => {
        const mapped_resource_files = [...resource_commitable_files.mod_paths, ...resource_commitable_files.add_paths];
        const identity_files_to_add = mapped_resource_files;
        const identity_files_to_remove = resource_commitable_files.del_paths;
        const build_identity_files = () => {
            const build_identities = Promise.all(mapped_resource_files.map(create));
            const remove_identities = Promise.all(identity_files_to_remove.map(remove));
            return Promise.all([build_identities, remove_identities]);
        };

        const stage_identity_files = () => {
            const add_identities_to_git_stage = git_repo_manager.add_files(identity_files_to_add.map(identity_utilities.resource_path_to_identity_path));
            const remove_identities_from_git_stage = git_repo_manager.remove_files(identity_files_to_remove.map(identity_utilities.resource_path_to_identity_path));
            return Promise.all([add_identities_to_git_stage, remove_identities_from_git_stage]);
        };

        return build_identity_files()
            .then(() => stage_identity_files())
            .catch(handle_error);
    };

    return {
        list,
        find,
        get,
        compare,
        build_and_stage_identity_files
    };
};
