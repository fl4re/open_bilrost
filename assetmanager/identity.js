/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const crypto = require('crypto');

const errors = require('../lib/errors')('Identity');
const IFS = require('../ifs/services');

const filter_error = err => {
    throw errors.INTERNALERROR(err);
};

const ifs_ignores = ['.git'];

module.exports = (ifs_adapter, git_repo_manager, utilities, list_parent_assets) => {

    const get_resource_hash = async ref => {
        const identity = await ifs_adapter.readJson(utilities.resource_ref_to_identity_path(ref));
        return identity.hash;
    };

    const format_identity_metadata = async ({ path, kind, mime }) => {
        const ref = utilities.identity_path_to_resource_ref(path, ifs_adapter.path);
        return {
            kind,
            ref,
            path: utilities.map_resource_identity_path(path),
            mime,
            hash: await get_resource_hash(ref)
                .catch(err => {
                    if (!err.toString().includes('ENOENT') && !err.toString().includes('EISDIR')) {
                        throw err;
                    } else {
                        return '';
                    }
                })
        };
    };

    const list = async (ref = '/resources/') => {
        const path = utilities.resource_ref_to_identity_path(ref);
        try {
            let stats = await IFS.get_stats(ifs_adapter, path, ifs_ignores);
            if (stats.kind === 'file-list') {
                stats.items = await Promise.all(stats.items.map(format_identity_metadata));
            } else {
                stats = await format_identity_metadata(stats);
            }
            return stats;
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
            stats.items = await Promise.all(stats.items.map(format_identity_metadata));
            return stats;
        } catch (err) {
            filter_error(ref);
        }
    };

    const build_hash = path => new Promise((resolve, reject) => {
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

    // compare the resource sha given by its content with the hash defined by identity files
    const compare = ref => get_resource_hash(ref)
        .catch(err => {
            if (err.code === 'ENOENT') {
                throw {
                    code: 1 // no identity file
                };
            } else {
                filter_error(err);
            }
        })
        .then(hash => build_hash(utilities.ref_to_relative_path(ref))
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

    const build_resource_identity = ref => build_hash(utilities.ref_to_relative_path(ref))
        .then(read_hash => ifs_adapter.outputFormattedJson(utilities.resource_ref_to_identity_path(ref), { hash: read_hash }));

    const remove_resource_identity = async ref => {
        const parents = await list_parent_assets(ref);
        if (parents.length <= 1) {
            await ifs_adapter.removeFile(utilities.resource_ref_to_identity_path(ref));
        }
    };

    const build_and_stage_identity_files = resource_commitable_files => {
        const mapped_resource_files = [...resource_commitable_files.mod, ...resource_commitable_files.add];
        const identity_files_to_add = mapped_resource_files;
        const identity_files_to_remove = resource_commitable_files.del;
        const build_identity_files = () => {
            const build_identities = Promise.all(mapped_resource_files.map(build_resource_identity));
            const remove_identities = Promise.all(identity_files_to_remove.map(remove_resource_identity));
            return Promise.all([build_identities, remove_identities]);
        };

        const stage_identity_files = () => {
            const add_identities_to_git_stage = git_repo_manager.add_files(identity_files_to_add.map(utilities.resource_ref_to_identity_path));
            const remove_identities_from_git_stage = git_repo_manager.remove_files(identity_files_to_remove.map(utilities.resource_ref_to_identity_path));
            return Promise.all([add_identities_to_git_stage, remove_identities_from_git_stage]);
        };

        return build_identity_files()
            .then(() => stage_identity_files())
            .catch(filter_error);
    };

    return {
        list,
        find,
        get_resource_hash,
        build_and_stage_identity_files,
        compare
    };
};
