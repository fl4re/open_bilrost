/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _path = require('path').posix;
const fs = require('fs-extra');

module.exports = name => {
    const path = _path.join(process.cwd().replace(/\\/g, '/'), 'tmp', 'fixtures', name);
    const config_base_path = _path.join(path, 'Config');
    try {
        fs.statSync(config_base_path);
    } catch (err) {
        if (err.code === 'ENOENT') {
            fs.mkdirsSync(config_base_path);
        }
    }
    const cache_base_path = _path.join(path, 'Cache');
    try {
        fs.statSync(cache_base_path);
    } catch (err) {
        if (err.code === 'ENOENT') {
            fs.mkdirsSync(cache_base_path);
        }
    }
    return {
        get_path: () => path,
        get_config_path: () => config_base_path,
        get_cache_path: () => cache_base_path,
        create: (relative = './') => fs.mkdirp(_path.join(path, relative)),
        remove: () => fs.remove(path)
    };
};
