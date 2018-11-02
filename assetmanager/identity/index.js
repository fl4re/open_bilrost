/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const crypto = require('crypto');

const errors = require('../../lib/errors')('Identity');
const IFS = require('../../ifs/services');
const identity = require('./identity');

const filter_error = err => {
    throw errors.INTERNALERROR(err);
};

const ifs_ignores = ['.git'];

module.exports = (ifs_adapter, git_repo_manager, utilities, list_parent_assets) => {

    const build_hash = ref => new Promise((resolve, reject) => {
        const path = utilities.ref_to_relative_path(ref);
        const fd_hash = ifs_adapter.createReadStream(path);
        const hash = crypto.createHash('sha256');
        hash.setEncoding('hex');
        hash.on('error', reject);
        hash.on('finish', () => {
            const read_hash = hash.read();
            resolve(read_hash);
        });
        fd_hash.on('error', reject);
        fd_hash.pipe(hash);
    });

    const instantiate_identity = identity(ifs_adapter, utilities, list_parent_assets);

    const list = async (ref = '/resources/') => {
        const path = utilities.resource_ref_to_identity_path(ref);
        try {
            let stats = await IFS.get_stats(ifs_adapter, path, ifs_ignores);
            if (stats.kind === 'file-list') {
                const identities = {};
                identities.items = stats.items.map(instantiate_identity);
                return identities;
            } else {
                const identity = instantiate_identity(stats);
                return identity;
            }
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

    const find = async (ref = '/resources', query) => {
        const path = utilities.resource_ref_to_identity_path(ref);
        try {
            const stats = await IFS.search_query(ifs_adapter, path, query, ifs_ignores);
            const identities = {};
            identities.items = stats.items.map(instantiate_identity);
            return identities;
        } catch (err) {
            filter_error(ref);
        }
    };

    // compare the resource sha given by its content with the hash defined by identity files
    // TODO To pass resource object here
    const compare = ref => instantiate_identity({ ref })
        .get_hash()
        .catch(err => {
            if (err.code === 'ENOENT') {
                throw {
                    code: 1 // no identity file
                };
            } else {
                filter_error(err);
            }
        })
        .then(hash => build_hash(ref)
            .catch(err => {
                if (err.code === 'ENOENT') {
                    throw {
                        code: 2 // no resources
                    };
                } else {
                    filter_error(err);
                }
            })
            .then(read_hash => read_hash === hash)
        );

    const build_and_stage_identity_files = async resource_commitable_files => {
        const identity_files_to_add = [...resource_commitable_files.mod_paths, ...resource_commitable_files.add_paths].map(utilities.resource_path_to_identity_path);
        const identity_files_to_remove = resource_commitable_files.del_paths.map(utilities.resource_path_to_identity_path);
        try {
            const create_identities = Promise.all(identity_files_to_add.map(async ref => instantiate_identity({ ref }).set_hash(await build_hash(ref))));
            const remove_identities = Promise.all(identity_files_to_remove.map(ref => instantiate_identity({ ref }).set_hash()));
            await Promise.all([create_identities, remove_identities]);
            const add_identities_to_git_stage = git_repo_manager.add_files(identity_files_to_add.map(utilities.resource_ref_to_identity_path));
            const remove_identities_from_git_stage = git_repo_manager.remove_files(identity_files_to_remove.map(utilities.resource_ref_to_identity_path));
            await Promise.all([add_identities_to_git_stage, remove_identities_from_git_stage]);
        } catch (err) {
            filter_error(err);
        }
    };

    return {
        list,
        find,
        build_and_stage_identity_files,
        compare
    };
};
