/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _path = require('path').posix;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const FILENAME = 'config.json';

const create_adapter = path => {
    const adapter = new FileSync(path);
    const db = low(adapter);
    return {
        defaults: default_entries => db.defaults(default_entries).write(),
        get: key => db.get(key).value(),
        get_all: () => db.value(),
        set: (key, new_value) => db.set(key, new_value).write(),
        del: key => db.set(key, undefined).write()
    };
};

module.exports = (default_configs, settings_path, envs = {}, cli_args = {}) => {
    const default_keys = Object.keys(default_configs);
    const filter = obj => JSON.parse(JSON.stringify(obj, default_keys));
    const config_file_path = _path.join(settings_path, FILENAME);
    const db = create_adapter(config_file_path);
    const current_config =  db.get_all();
    const config = Object.assign({}, default_configs, current_config);
    const cooked_config = Object.keys(config)
        .reduce((new_config, key) => {
            Object.defineProperty(new_config, key, {
                get: () => cli_args[key] || envs[key] || db.get(key),
                set: new_value => {
                    this[key] = new_value;
                    db.set(key, new_value);
                },
                enumerable: true,
                configurable: true
            });
            return new_config;
        }, {
            get_all: () => filter(Object.assign({}, db.get_all(), envs, cli_args)),
            del: key => db.del(key)
        });
    db.defaults(filter(config));
    return cooked_config;
};
