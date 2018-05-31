/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

var minimatch = require('minimatch');
var URL = require('url');

module.exports = {

    //Filter a name with a list of files using minimatch
    filter_name : function(files, name_filter) {
        return files.filter(function (el) {return minimatch(el.name || el.uri.replace(/^.*[\\\/]/, ''), name_filter || '*');});
    },

    //Utility for slicing a list of files
    slice : function(files, start, number) {
        return files.slice(start, start + number);
    },

    // Utility to create the next reference url for paging
    get_next_url : function(url, next) {
        var parsed_url = URL.parse(url, true);
        parsed_url.query.start = next;
        parsed_url.search = undefined;  // If search is set it prevails over the query, we must unset it
        return parsed_url.format();
    },

    format_file: function(_file) {
        if (_file.error) {
            var code = _file.error.code;
            return {
                "kind": code,
                "id": _file.name,
                "fileSize": code,
                "createdDate": code,
                "modifiedDate": code,
                "fileExtension": _file.extension,
                "mime-type": _file.mime,
                "path": _file.path
            };
        } else {
            return {
                "kind": _file.isFile() ? "file" : "dir",
                "id": _file.name,
                "fileSize": _file.size,
                "createdDate": _file.ctime,
                "modifiedDate": _file.mtime,
                "fileExtension": _file.extension,
                "mime-type": _file.mime,
                "hasChildren": _file.hasChildren,
                "path": _file.path
            };
        }
    },

    format_drive: function(_drive) {
        return {
            kind: 'dir',
            id: _drive.name + '/',
            fileSize: _drive.size,
            hasChildren: true
        };
    }
};