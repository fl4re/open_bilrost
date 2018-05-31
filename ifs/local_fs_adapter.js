/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

var drivelist = require('drivelist');
var fs = require('fs-extra');
var mime = require('mime');
var minimatch = require('minimatch');
var os = require('os');
var promisify = require('../util/promisify');
var recursive = require('recursive-readdir');
var recursiveSync = require('recursive-readdir-sync');
var walker = require('walker');
var isWin = /^win/.test(process.platform);

/*
TODO hide files to writeJson, createFolder and outputJson methods
"fswin": "^2.15.1031" I used this module for hiding folder/files
on windows but I couldn't get write access. Need to find another
solution.
var fswin = '';
if(/^win/.test(process.platform)){
    fswin = require('fswin');
}*/
/*

 forcing posix because win32 is buggy
 The posix module works best even for win32 environments.
 The fs module already converts separators to system specific.
 */
var _p = require('path').posix;

function join(path1, path2) {
    return _p.join(path1, path2);
}
function basename(path) {
    return _p.basename(path);
}
function extension(path) {
    var extname = _p.extname(path);
    return (extname.slice(0, 1) === '.' ? extname.slice(1) : extname);
}

function normalize(path) {
    if (isWin) {
        path = path[0].toUpperCase() + path.substr(1);
    }
    return path;
}

var local_FS_adapter = function (base_path) {
    base_path = base_path.replace(/\\/g, '/');

    function isPlatformWin() {
        return os.platform() === 'win32';
    }

    function absolute_path (path) {
        if (isPlatformWin() && base_path === '/') {
            return path;
        }
        return join(base_path, path);
    }

    function relative_path(path) {
        path = path.replace(/\\/g, '/');
        return _p.relative(base_path, path);
    }

    function plain_stat(path) {
        return promisify(fs.stat)(absolute_path(path))
            .catch(function (reason) {
                if (reason.errno === -2) {
                    throw reason;
                }
            });
    }

    function convert_to_plain_stat(path) {
        return function (files) {
            return Promise.all(
                files.map(function (file) {
                    return plain_stat(join(path, file));
                })
            );
        };
    }

    function hasSubDirectories(path) {
        return promisify(fs.readdir)(absolute_path(path))
            .then(convert_to_plain_stat(path))
            .then(function (files) {
                return !!files.find(function (file) {
                    return file.isDirectory();
                });
            });
    }

    function stat(path) {
        return promisify(fs.stat)(absolute_path(path))
            .then(function (stat) {
                var file = stat;
                file.name = basename(path);
                file.extension = extension(path);
                file.mime = mime.lookup(path);
                file.path = absolute_path(path);
                if (file.isDirectory()) {
                    return hasSubDirectories(path).then(function (resp) {
                        file.hasChildren = resp;
                        return file;
                    });
                }
                return file;
            })
            .catch(function (reason) {
                if (reason.errno === -2) {
                    throw reason;
                }
                var file = {};
                file.name = basename(path);
                file.extension = extension(path);
                file.mime = mime.lookup(path);
                file.error = reason;
                return file;
            });
    }

    function getDirectories(path) {
        return promisify(fs.readdir)(absolute_path(path))
            .then(files =>
                Promise.all(files.map(file =>
                    promisify(fs.stat)(join(absolute_path(path), file))
                        .then(stat => {
                            stat.name = file;
                            return stat;
                        })
                ))
            ).then(stats =>
                stats.filter(stat => stat.isDirectory())
                    .map(stat => join(path, stat.name))
            );
    }

    function remove(path) {
        return stat(path).then(function () {
            return promisify(fs.remove)(absolute_path(path));
        });
    }

    function filter_name(name_filter) {
        return function (files) {
            return files.filter(function (el) {return minimatch(el, name_filter || '*', {dot : true});});
        };
    }

    function slice(start, number) {
        return function (files) {
            return files.slice(start, start + number);
        };
    }

    function convert_to_stat(path) {
        return function (files) {
            return Promise.all(
                files.map(function (file) {
                    return stat(join(path, file));
                })
            );
        };
    }

    function getDriveList() {
        return promisify(drivelist.list)();
    }

    function readdir(path, name, maxResults, start) {
        var promise = promisify(fs.readdir)(absolute_path(path));
        if( name ) {
            promise = promise.then(filter_name(name));
        }
        if( maxResults && start ) {
            promise = promise.then(slice(start, maxResults));
        }
        return promise.then(convert_to_stat(path));
    }

    function dir_length(path, name) {
        return promisify(fs.readdir)(absolute_path(path))
            .then(filter_name(name))
            .then(function (files) { return files.length; });
    }

    function search (path, query_json, dir_globs) {
        const apply_operator = function (operator, val1, val2, val3) {
            let boolean;
            switch (operator) {
                case "<":
                    boolean = val1 < val2;
                    break;
                case "<=":
                    boolean = val1 <= val2;
                    break;
                case ">":
                    boolean = val1 > val2;
                    break;
                case ">=":
                    boolean = val1 >= val2;
                    break;
                case "..":
                    boolean = val1 < val2 && val2 < val3;
                    break;
                default:
                    boolean = val1 === Number(val2);
                    break;
            }
            return boolean;
        };
        const filter = function (file, stat) {
            const is_file = stat.isFile();
            const is_directory = stat.isDirectory();
            return (function parse_query_entity (json) {
                let boolean;
                switch (json.type) {
                    case "word":
                        boolean = stat.name.includes(json.value);
                        break;
                    case "kind":
                        if (json.value === "file" && is_file) {
                            boolean = true;
                        } else if (json.value === "directory" && is_directory) {
                            boolean = true;
                        } else {
                            boolean = false;
                        }
                        break;
                    case "extension":
                        boolean = json.value === stat.extension;
                        break;
                    case "mime":
                        boolean = json.value === stat.mime;
                        break;
                    case "size":
                        if (json.operator === "..") {
                            let split = json.value.split("..");
                            boolean = apply_operator(json.operator, split[0], stat.size, split[1]);
                        } else {
                            boolean = apply_operator(json.operator, stat.size, json.value);
                        }
                        break;
                    case "created":
                        if (json.operator === "..") {
                            let split = json.value.split("..");
                            boolean = apply_operator(json.operator, new Date(split[0]), stat.ctime, new Date(split[1]));
                        } else {
                            boolean = apply_operator(json.operator, stat.ctime, new Date(json.value));
                        }
                        break;
                    case "modified":
                        if (json.operator === "..") {
                            let split = json.value.split("..");
                            boolean = apply_operator(json.operator, new Date(split[0]), stat.mtime, new Date(split[1]));
                        } else {
                            boolean = apply_operator(json.operator, stat.mtime, new Date(json.value));
                        }
                        break;
                    case "or":
                        boolean = json.values.reduce(function (previous, current, index) {
                            if (index === 1) {
                                previous = parse_query_entity(previous);
                            }
                            return previous || parse_query_entity(current);
                        });
                        break;
                    case "and":
                        boolean = json.values.reduce(function (previous, current, index) {
                            if (index === 1) {
                                previous = parse_query_entity(previous);
                            }
                            return previous && parse_query_entity(current);
                        });
                        break;
                    case "not":
                        boolean = !parse_query_entity(json.values[0]);
                        break;
                    default:
                        throw "undefined type in search query representation";
                }
                return boolean;
            })(query_json);

        };

        return new Promise(function (resolve, reject){
            let result = [];
            const event_emitter = walker(absolute_path(path));
            if (dir_globs) {
                event_emitter.filterDir(function(dir, stat) {
                    let boolean = true;
                    dir_globs.forEach(function (glob) {
                        boolean = boolean && !minimatch(dir, glob);
                    });
                    return boolean;
                });
            }
            event_emitter
                .on('entry', function(entry, stat) {
                    entry = entry.replace(/\\/g,'/');
                    stat.name = basename(entry);
                    stat.extension = extension(entry);
                    stat.mime = mime.lookup(entry);
                    stat.path = entry;
                    let is_not_filtered = filter(entry, stat);
                    if (is_not_filtered) {
                        result.push(stat);
                    }
                })
                .on('error', function(err, entry) {
                    reject('Got error ' + err + ' on entry ' + entry);
                })
                .on('end', function() {
                    resolve(result);
                });
        });
    }

    if (isPlatformWin() && base_path !== '/' && _p.isAbsolute(base_path)) {
        base_path = base_path.substring(1);
    }

    return promisify(fs.ensureDir)(base_path).then(function () {
        return {
            type: 'local',
            path: normalize(base_path),
            stat: stat,
            read: function (path) {
                return fs.createReadStream(absolute_path(path));
            },
            write: function (path) {
                return fs.createWriteStream(absolute_path(path));
            },
            removeFile: function(path, recursive) {
                return new Promise( function(resolve, reject){
                    fs.remove( absolute_path(path), function(err){
                        if(err){
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                    /*if(recusrive){
                        TODO remove all folder tree from uri if empty
                    }*/
                });
            },
            readJson: function(path) {
                return new Promise( function(resolve, reject){
                    fs.readJson(absolute_path(path), function(err, json){
                        if(err){
                            reject(err);
                        } else {
                            resolve(json);
                        }
                    });
                });
            },
            readFile: function(path) {
                return new Promise( function(resolve, reject){
                    fs.readFile(absolute_path(path), 'utf8', function(err, json) {
                        if(err){
                            reject(err);
                        } else {
                            resolve(json);
                        }
                    });
                });
            },
            writeJson: function(path, json, isHidden) {
                //TODO hidden files for win
                return new Promise( function(resolve, reject){
                    path = absolute_path(path);
                    fs.writeJson(path, json, function(err){
                        if(err){
                            reject(err);
                        } else {
                            resolve(json);
                        }
                    });
                });
            },
            writeFile: function(path, content) {
                //TODO hidden files for win
                return new Promise( function(resolve, reject){
                    path = absolute_path(path);
                    fs.writeFile(path, content, function(err){
                        if(err){
                            reject(err);
                        } else {
                            resolve(content);
                        }
                    });
                });
            },
            createFolder: function(path, isHidden) {
                //TODO hidden files for win
                path = absolute_path(path);
                fs.mkdirsSync(path);
            },
            outputJson: function(path, json, isHidden) {
                //TODO hidden files for win
                return new Promise( function(resolve, reject){
                    var fullpath = absolute_path(path);
                    fs.outputJson(fullpath, json, function(err){
                        if(err){
                            reject(err);
                        } else {
                            resolve(json);
                        }
                    });
                });
            },
            outputFormattedJson: function(path, json) {
                return new Promise( function(resolve, reject){
                    var fullpath = absolute_path(path);
                    fs.outputFile(fullpath,  JSON.stringify(json, null, 4), function(err){
                        if(err){
                            reject(err);
                        } else {
                            resolve(json);
                        }
                    });
                });
            },
            getFilesRecursively : function(path, list_of_files_to_ignore) {
                return new Promise(function(resolve, reject){
                    recursive(absolute_path(path), list_of_files_to_ignore ? list_of_files_to_ignore : [], function(err, files){
                        if(err){
                            reject(err);
                        } else {
                            resolve(files.map(function (file) {
                                return relative_path(file);
                            }));
                        }
                    });
                });
            },
            getFilesRecursivelySync : function(path) {
                return recursiveSync(absolute_path(path)).map(function(file){
                    return relative_path(file.replace(/\\/g, '/'));
                });
            },
            accessSync : function(path) {
                return fs.accessSync(absolute_path(path), fs.F_OK);
            },
            access : function(path) {
                return new Promise( (resolve, reject) => {
                    fs.access(absolute_path(path), err => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                });
            },
            readdirSync : function(path) {
                return fs.readdirSync(absolute_path(path));
            },
            readJsonSync : function(path) {
                return fs.readJsonSync(absolute_path(path));
            },
            writeJsonSync : function(path, content) {
                return fs.writeJsonSync(absolute_path(path), content);
            },
            lstatSync : function(path) {
                return fs.lstatSync(absolute_path(path));
            },
            createReadStream : function(path) {
                return fs.createReadStream(absolute_path(path));
            },
            search : search,
            getDirectories : getDirectories,
            remove: remove,
            isPlatformWin: isPlatformWin,
            getDriveList: getDriveList,
            getAbsolutePath: absolute_path,
            readdir: readdir,
            dir_length: dir_length
        };
    });
};

module.exports = local_FS_adapter;
