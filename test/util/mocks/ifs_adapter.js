/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const isWin = /^win/.test(process.platform);

function normalize(path) {
    if (isWin) {
        path = path[0].toUpperCase() + path.substr(1);
    }
    return path;
}

module.exports = (path, maps) => {
    if (!maps) {
        maps = {};
    }
    return {
        path: normalize(path),
        readdir: path => Promise.resolve(maps.readdir[path]),
        readJsonSync: path => maps.readJsonSync[path](),
        access: path => maps.access[path](),
        lstatSync: path => maps.lstatSync[path],
        readFile: path => Promise.resolve(maps.readFile[path]),
        readJson: path => maps.readJson[path](),
        getFilesRecursively: path => Promise.resolve(maps.getFilesRecursively[path]),
        outputJson: (path, json) => Promise.resolve(json),
        outputFormattedJson: (path, content) => Promise.resolve(content),
        writeJson: path => Promise.resolve(),
        removeFile: () => Promise.resolve(),
        getDirectories: path => maps.getDirectories[path]
    };
};
