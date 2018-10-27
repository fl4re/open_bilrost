/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*

This modules aims to provide a rest api for creating, importing, organizing, viewing,
and modifying content assets. This is providing a back end layer to the content browser

It deals with notion of workspace and assets. See following docs for more information
*/
'use strict';

const create_handler = require('../lib/handler');
const _path = require('path').posix;

module.exports = function(server, context) {
    const Project = require('../assetmanager/project_manager')(context);

    // /contentbrowser/projects/{project_full_name}/{branch_name}/{asset_ref}?{filter}{paging}
    server.get(/^\/contentbrowser\/projects\/([^/]*)\/([^/]*)(?:\/)?(.*)?\/(assets\/.*)/, function(req, res, next) {
        const handler = create_handler(req, res, next);
        const organization = req.params.organization;
        const name = req.params.repository;
        const branch_name = req.params.branch;
        const asset_ref = req.params.ref;
        const options = {
            filterName: req.query.uri,
            maxResults: parseInt(req.query.maxResults, 10),
            start: parseInt(req.query.start, 10)
        };
        Project.assets(asset_ref, _path.join(organization, name), branch_name, options)
            .then(project => {
                handler.sendJSON(project, 200);
            })
            .catch(err => handler.handleError(err));

    });

    // /contentbrowser/projects/{project_full_name}/{branch_name}/{resource_ref}?{filter}{paging}
    server.get(/^\/contentbrowser\/projects\/([^/]*)\/([^/]*)(?:\/)?(.*)?\/(resources\/.*)/, function(req, res, next) {
        res.status(501);
        res.end();
        next();
    });

    // /contentbrowser/projects/{project_full_name}?{filter}{paging}
    server.get(/^\/contentbrowser\/projects\/([^/]*)?(?:\/)?([^/]*)?/, function(req, res, next) {
        const handler = create_handler(req, res, next);
        const project_full_name = req.params.project_full_name;
        const options = {
            filterName: req.query.name,
            maxResults: parseInt(req.query.maxResults, 10),
            start: parseInt(req.query.start, 10)
        };

        Project.get(project_full_name, options)
            .then(project => {
                handler.sendJSON(project, 200);
            })
            .catch(err => handler.handleError(err));
    });

};
