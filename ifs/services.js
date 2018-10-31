/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const search_parser = require('search_parser');
const utilities = require('./utilities');
const macro_regex = /^(kind|mime|created|modified|extension|size|depth):(<=?|>=?|\.\.)?$/;

const is_ignored_file_in_path = (path, files_to_ignore) => files_to_ignore.find(ignore_entry => path.includes(ignore_entry));

module.exports = {
    async get_stats (adapter, path, ignores) {
        if (is_ignored_file_in_path(path, ignores)) {
            throw "Ignored filename found in given path";
        }
        const file = await adapter.stat(path);
        if (file.error) {
            throw "Not found";
        } else if(file.isFile()) {
            return file;
        } else if (file.isDirectory()) {

            // Performance note:
            // Here we call two times to list directory contents, first call limits the
            // quantity but stats every file included. There are N+1 call to fs.
            // Second call doesn't limit but only calls 1 to fs.
            const files = (await adapter.readdir(path))
                .filter(({ path }) => !is_ignored_file_in_path(path, ignores))
                .map(utilities.format_file);
            return {
                kind: 'file-list',
                items: files
            };
        } else {
            //ToDo: support links, etc
            throw "Not supported";
        }
    },

    async search_query (adapter, path, query, ignores) {
        const representation = search_parser(query, macro_regex);
        const file_stats = (await adapter.search(path, representation))
            .filter(({ path }) => !is_ignored_file_in_path(path, ignores))
            .map(utilities.format_file);
        return {
            kind: 'file-list',
            items: file_stats
        };
    }
};
