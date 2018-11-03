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
            return [utilities.format_file(file)];
        } else if (file.isDirectory()) {
            return (await adapter.readdir(path))
                .filter(({ path }) => !is_ignored_file_in_path(path, ignores))
                .map(utilities.format_file);
        } else {
            throw "Not supported";
        }
    },
    async search_query (adapter, path, query, ignores) {
        const representation = search_parser(query, macro_regex);
        return (await adapter.search(path, representation))
            .filter(({ path }) => !is_ignored_file_in_path(path, ignores))
            .map(utilities.format_file);
    }
};
