/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const fs = require('fs-extra');
const path = require('path');
const promisify = require('../util/promisify');

module.exports = cache_dir_path => {
    const cache = {
        get_path: key => path.join(cache_dir_path, (key ? key : '')),
        get_tmp_path: key => `${cache.get_path(key)}.tmp`,
        write: (key, file_path) => {
            const cache_path = path.join(cache_dir_path, key);
            return promisify(fs.copy)(file_path, cache_path);
        },
        exist: key => promisify(fs.access)(path.join(cache_dir_path, key))
            .catch(err => {
                throw "This cache entry doesn't exist";
            }),
        read: (key, target_path) => {
            const cache_path = path.join(cache_dir_path, key);
            return promisify(fs.copy)(cache_path, target_path);
        }
    };
    return cache;
};
