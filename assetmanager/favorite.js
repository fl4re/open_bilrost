/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const os = require('os');
const Path = require('path');
const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');

const errors = require('../lib/errors')('favorite');

const configPath =/^win/.test(process.platform)?
    Path.join(process.env.APPDATA,'/Bilrost/Config/workspaces.json'):
    Path.join(os.homedir(), '/Library/Bilrost/Config/workspaces.json');

const _workspace_name_regex = /^[[\w/.-]{0,100}$/;
const _workspace_file_uri_regex = /^file:\/\/\/.*$/;

const get_identifier_type = identifier => {
    if (_workspace_name_regex.test(identifier)) {
        return 'name';
    } else if (_workspace_file_uri_regex.test(identifier)) {
        return 'file_uri';
    }
};

const build_finder = identifier => ({ [get_identifier_type(identifier)]: identifier });

let buffer = {};

module.exports = (path = configPath) => {
    const adapter = new FileAsync(path, {
        defaultValue: {
            favorite: []
        }
    });
    if (!buffer[path]) {
        buffer[path] = low(adapter);
    }
    const db = buffer[path];

    const object_retriever = async identifier => (await db)
        .get('favorite')
        .find(build_finder(identifier));

    const favorite = {
        list: async () => (await db)
            .get('favorite')
            .value(),
        find_by_file_uri: async _file_uri => (await db)
            .get('favorite')
            .find(({ file_uri }) => file_uri === _file_uri)
            .value(),
        find_by_name: async _name => (await db)
            .get('favorite')
            .find(({ name }) => name === _name)
            .value(),
        find: async identifier => (await object_retriever(identifier))
            .value(),
        add: async ({ name, file_uri }) => {
            let [is_name_found, is_file_uri_found] = await Promise.all([favorite.find_by_name(name), favorite.find_by_file_uri(file_uri)]);
            if (!is_name_found && !is_file_uri_found) {
                return (await db)
                    .get('favorite')
                    .push({
                        name,
                        file_uri
                    })
                    .write();
            } else {
                throw errors.ALREADYEXIST(`Workspace (${name}, ${file_uri})`);
            }
        },
        update: async (identifier, new_object) => (await object_retriever(identifier))
            .assign(new_object)
            .write(),
        remove: async identifier => (await db)
            .get('favorite')
            .remove(build_finder(identifier))
            .write(),
        flush: async () => (await db)
            .set('favorite', [])
            .write()
    };
    return favorite;
};
