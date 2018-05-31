/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
 Adapters module is the store and factory of different types of FS adapters.
 There can be several different implementation: local fs, remote fs or a transformed fs.

 */
'use strict';
var local_FS_adapter = require('./local_fs_adapter');

var maps = {};

module.exports = {

    list: function () {
        return maps;
    },

    get: function (id) {
        if (!maps[id]) { return; }
        return maps[id];
    },

    set: function (id, options) {
        if (options.type === 'local') {
            return local_FS_adapter(options.path).then(function (adapter) {
                maps[id] = adapter;
                return adapter;
            });
        } else {
            return Promise.reject('Not implemented');
        }

    }

};
