/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _path = require('path').posix;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const FILENAME = 'config.json';

const create_adapter = (path, default_entries) => {
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

module.exports = (settings_path, default_configs, envs, cli_args) => {
    const config_file_path = _path.join(settings_path, FILENAME);
    const db = create_adapter(config_file_path);
    const config = Object.assign({}, default_configs, envs, cli_args);
    const cooked_config = Object.keys(config)
        .reduce((new_config, key) => {
            const is_known_config = Object.keys(default_configs).includes(key);
            if (is_known_config) {
                db.set(key, config[key]);
                Object.defineProperty(new_config, key, {
                    get: () => db.get(key),
                    set: new_value => {
                        db.set(key, new_value);
                        this[key] = new_value;
                    },
                    enumerable: true,
                    configurable: true
                });
            } else {
                delete config[key];
            }
            return new_config;
        }, {
            get_all: () => db.get_all(),
            del: key => db.del(key)
        });

    return cooked_config;
};
