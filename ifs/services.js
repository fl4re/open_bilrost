/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const search_parser = require('search_parser');
const macro_regex = /^(kind|mime|created|modified|extension|size|depth):(<=?|>=?|\.\.)?$/;

module.exports = {
    get_stats (adapter, path) {
        var absolutePath = adapter.getAbsolutePath(path);
        if (adapter.isPlatformWin() && absolutePath === '') {
            return adapter.getDriveList().then(function(drives) {
                return {
                    kind: 'drive-list',
                    items: drives
                };
            });
        }

        return adapter.stat(path)
            .then(function (file) {
                if (file.error) {
                    throw "Not found";
                } else if(file.isFile()) {
                    return file;
                } else if (file.isDirectory()) {

                    // Performance note:
                    // Here we call two times to list directory contents, first call limits the
                    // quantity but stats every file included. There are N+1 call to fs.
                    // Second call doesn't limit but only calls 1 to fs.
                    return adapter.readdir(path).then(function (files) {
                        return {
                            kind: 'file-list',
                            items: files
                        };
                    });
                } else {
                    //ToDo: support links, etc
                    throw "Not supported";
                }
            });
    },

    search_query (adapter, path, query) {
        const representation = search_parser(query, macro_regex);
        return adapter.search(path, representation)
            .then(function (file_stats) {
                return {
                    kind: 'file-list',
                    items: file_stats
                };
            });
    }
};
