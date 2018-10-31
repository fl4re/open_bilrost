/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const crypto = require('crypto');

const errors = require('../lib/errors')('Identity');

const filter_error = err => {
    throw errors.INTERNALERROR(err);
};

module.exports = (ifs_adapter, git_repo_manager, utilities, list_parent_assets) => {

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

    const get_resource_hash = ref => ifs_adapter.readJson(utilities.resource_ref_to_identity_path(ref))
        .then(identity => identity.hash);

    // compare the resource sha given by its content with the hash defined by identity files
    const compare = ref => get_resource_hash(ref)
        .catch(err => {
            if (err.code === 'ENOENT') {
                throw {
                    code: 1 // no identity file
                };
            } else {
                throw err;
            }
        })
        .then(hash => build_hash(utilities.ref_to_relative_path(ref))
            .catch(err => {
                if (err.code === 'ENOENT') {
                    throw {
                        code: 2 // no resources
                    };
                } else {
                    throw err;
                }
            })
            .then(read_hash => read_hash === hash));

    const build_resource_identity = path => build_hash(path)
        .then(read_hash => ifs_adapter.outputFormattedJson(utilities.resource_path_to_identity_path(path), { hash: read_hash }));

    const remove_resource_identity = async path => {
        const parents = await list_parent_assets(utilities.relative_path_to_ref(path));
        if (parents.length <= 1) {
            await ifs_adapter.removeFile(utilities.resource_path_to_identity_path(path));
        }
    };
    const build_and_stage_identity_files = resource_commitable_files => {
        const mapped_resource_files = [...resource_commitable_files.mod_paths, ...resource_commitable_files.add_paths];
        const identity_files_to_add = mapped_resource_files;
        const identity_files_to_remove = resource_commitable_files.del_paths;
        const build_identity_files = () => {
            const build_identities = Promise.all(mapped_resource_files.map(build_resource_identity));
            const remove_identities = Promise.all(identity_files_to_remove.map(remove_resource_identity));
            return Promise.all([build_identities, remove_identities]);
        };

        const stage_identity_files = () => {
            const add_identities_to_git_stage = git_repo_manager.add_files(identity_files_to_add.map(utilities.resource_path_to_identity_path));
            const remove_identities_from_git_stage = git_repo_manager.remove_files(identity_files_to_remove.map(utilities.resource_path_to_identity_path));
            return Promise.all([add_identities_to_git_stage, remove_identities_from_git_stage]);
        };

        return build_identity_files()
            .then(() => stage_identity_files())
            .catch(filter_error);
    };

    return {
        get_resource_hash,
        build_and_stage_identity_files,
        compare
    };
};
