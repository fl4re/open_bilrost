/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// const minimatch = require('minimatch');
const _path = require('path');

const model = require('./model');

const WORKSPACE_INTERNAL_FOLDER_PATH = require('./constant').WORKSPACE_INTERNAL_FOLDER_PATH;
const project_model = require('../project_factory');
const ifs = require('../../ifs/local_fs_adapter');
const branch_model = require('../branch');
const _error_outputs = require('../../lib/errors')("Workspace");
const get_internal_file_path = path => _path.join(WORKSPACE_INTERNAL_FOLDER_PATH, path ? path : '/');
//const utilities = require('./util')(get_internal_file_path);

// const _error_outputs = require('../lib/errors')("workspace manager");

// const transform_error = err => {
//     this.error = _error_outputs.INTERNALERROR(err);
//     throw this;
// };

module.exports = context => {
    // const favorite = context.favorite;

    // const find_by_file_uri = file_uri => new Workspace(file_uri, context);

    // const list = options => {
    //     const name_filter = options && options.filterName;
    //     const filter_undefined_workspaces = workspaces => workspaces.filter(workspace => workspace !== undefined);
    //     const filter_by_name = workspaces => name_filter ? workspaces.filter(workspace => minimatch(workspace.properties.name || '', name_filter || '*')) : workspaces;
    //     return favorite.list()
    //         .then(list => Promise.all(list.map(({ file_uri }) => new Workspace(file_uri, context).then(obj => obj, () => {}))))
    //         .then(filter_undefined_workspaces)
    //         .then(filter_by_name)
    //         .catch(transform_error);
    // };

    // function find_by_identifiers(identifiers) {
    //     if (identifiers && identifiers.file_uri) {
    //         return find_by_file_uri(identifiers.file_uri);
    //     } else {
    //         return Promise.reject({error: _error_outputs.NOTFOUND(identifiers)});
    //     }
    // }

    // const find = identifier => {
    //     const is_file_uri = /file:\/\/.*/.test(identifier);
    //     if (is_file_uri) {
    //         return find_by_file_uri(identifier);
    //     } else if (typeof identifier === 'string') {
    //         return favorite.find(identifier)
    //             .then(identifiers => find_by_identifiers(identifiers));
    //     } else {
    //         throw _error_outputs.INTERNALERROR('Identifier is not under string format.');
    //     }
    // };

    // return {
    //     list,
    //     find,
    //     find_by_file_uri
    // };z

    const get = async file_uri => {
        let project, properties, branch;
        const handle_not_found = (name, err) => {
            throw _error_outputs.NOTFOUND(`${name} data not found in ${file_uri}, ${err.toString()}`);
        };
        const get_internal_file_path = path => _path.join(WORKSPACE_INTERNAL_FOLDER_PATH, path ? path : '/');
        const ifs_adapter = ifs({ file_uri });
        try {
            await ifs_adapter.access();
        } catch (err) {
            handle_not_found('file system', err);
        }
        try {
            project = await project_model.get_project({ get_internal_file_path, ifs_adapter });
        } catch (err) {
            handle_not_found('project', err);
        }
        try {
            properties = await ifs_adapter.readJson(get_internal_file_path('workspace'));
        } catch (err) {
            handle_not_found('workspace', err);
        }
        try {
            branch = await branch_model.get(ifs_adapter.path);
        } catch (err) {
            handle_not_found('branch', err);
        }
        return model(ifs_adapter, project, branch, properties, context);
    };

    const del = async file_uri => {
        const adapter = (await get(file_uri)).ifs_adapter();
        await adapter.remove();
    };

    const create = async (url, branch, file_uri) => {
        const ifs_adapter = ifs(file_uri);
        try {
            await ifs_adapter.access();
            throw _error_outputs.ALREADYEXIST(ifs_adapter.path);
        } catch (err) {
            if (err.code === 'ENOENT') {
                await ifs_adapter.createFolder(ifs_adapter.path);
                try {
                    await repo_manager('git', ifs_adapter.path, context.credentials).clone_workspace(url, branch);
                } catch (err) {
                    throw _error_outputs.INTERNALERROR(err);
                }
                return get(file_uri);
            } else {
                throw _error_outputs.INTERNALERROR(err);
            }
        }
    };

    const populate = async (project, branch, file_uri, description = '') => {
        let properties;
        const ifs_adapter = ifs(file_uri);
        const create_internal_directory = async name => {
            const relative_path = get_internal_file_path(name);
            try {
                await ifs_adapter.access(relative_path);
            } catch (err) {
                if (err === 'ENOENT') {
                    await ifs_adapter.createFolder(relative_path);
                } else {
                    throw err;
                }
            }
        };
        try {
            properties = await properties.create(description);
            await create_internal_directory("assets");
            await create_internal_directory("resources");
        } catch (err) {
            throw _error_outputs.INTERNALERROR(err);
        }
        return properties;
    };

    const create_and_populate_workspace = (project, branch, protocol, file_uri, description, credentials) => {
        var url;
        if (protocol === 'ssh') {
            url = project.ssh_url;
        } else if (protocol === 'https') {
            url = project.https_url;
        } else {
            throw _error_outputs.INTERNALERROR(`${protocol} is not supported`);
        }
        return workspace_factory.create_workspace(url, branch, file_uri, credentials)
            .then(() => workspace_factory.populate_workspace(project, branch, file_uri, description));
    };

    // const populate

    return {
        create,
        populate,
        create_and_populate_workspace,
        get,
        del,
        save
    };

};
