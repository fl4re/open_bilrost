/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
 This module adds IFS routes to the server.

 I haven’t decided why the I, but FS is surely for File System.

 Inside Rest3d we need a way to browse remote server files, local work directory files or git trees. Therefore we need an API that allows to list (with filter) directories, get files (metadata or content), and put files in a virtualized file system that will eventually map to any of the above.

 Other rest3d modules are responsible of creating/registering a fs base url (/ifs/{id}), for example when creating a workspace we may refer to /ifs/ws12345. By now we are not going to specify how you create or register these ifs id.

 This API is going to follow rest principles, using http verbs, url to resources, …
 When getting/puttings files, file metadata will be passed by HTTP Headers, and file content in the body.
 When getting folder contents, the body representation will be JSON.

 */
'use strict';

var IFS = require("./services");
var utilities = require('./utilities.js');

module.exports = function (server) {
    var Handler = require('./../lib/handler');
    /*
     IFS is a rest interface to some internal FS.
     We have to separate the interface code from the FS implementation,
     because there can be several different implementation: local fs,
     remote fs or a transformed fs. Adapters module is the store and
     factory of different types of adapters.
     */
    var adapters = require('./adapters');

    var pathRegEx = /^\/ifs\/([a-zA-Z0-9_\.~-]+)\/(.*)/;  // /ifs/{key}/{path}

    server.get(pathRegEx, function (req, res, next) {
        var handler = new Handler(req, res, next);
        var adapterName = decodeURI(req.params[0]);
        var adapter = adapters.get(adapterName);
        var path = decodeURI(req.params[1]);

        if (!adapter) {
            return handler.handleError("adapter "+adapterName+" not found");
        }
        
        let promise;
        if (req.query.q) {
            promise = IFS.search_query(adapter, path, req.query.q);
        } else {
            promise = IFS.get_stats(adapter, path);
        }
        
        promise
            .then(function(result){
                if(result.kind === "file-list") {
                    var name_filter = req.query.name,
                        maxResults = parseInt(req.query.maxResults, 10) || 100,
                        start = parseInt(req.query.start, 10) || 0;
                    if(name_filter) {
                        result.items = utilities.filter_name(result.items, name_filter);
                    }
                    var total = result.items.length;
                    result.items = utilities.slice(result.items, start, maxResults);
                    result.items = result.items.map(utilities.format_file);
                    if (start + result.items.length < total) {
                        result.nextLink = utilities.get_next_url(req.url, start + maxResults);
                    }
                    result.totalItems = total;
                    return handler.sendJSON(result);
                } else if(!result.kind){
                    res.header('Last-Modified', result.mtime);
                    res.header('ETag', result.mtime.getTime().toString() + result.ino + result.size);
                    result = utilities.format_file(result);
                } else {
                    result.items = result.items.map(utilities.format_drive);
                }
                handler.sendJSON(result, 200);
            }).catch((reason) => {
                var statusCode = 404;
                if (reason === "Not found") {
                    statusCode = 404;
                } else if (reason === "Not supported") {
                    statusCode = 400;
                }
                handler.handleError({message: reason, statusCode: statusCode});
            });
    });

    server.put(pathRegEx, function (req, res, next) {
        var handler = new Handler(req, res, next);
        var local_path = decodeURI(req.params[1]);
        adapters.set(decodeURI(req.params[0]), {type: 'local', path: local_path})
            .then(function () {
                handler.sendJSON("Ok");
            }, function (reason) {
                handler.handleError(reason);
            });
    });

    server.get('/ifs', function (req, res, next) {
        var handler = new Handler(req, res, next);
        var file_systems = adapters.list();
        handler.sendJSON(file_systems);
    });

    server.get('/ifs/:id', function (req, res, next) {
        var handler = new Handler(req, res, next);
        var adapter = adapters.get(decodeURI(req.params.id));
        handler.sendJSON(adapter);
    });

};