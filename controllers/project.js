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

module.exports = function(server, { bilrost_client }) {
    const project = require('../models/project')(bilrost_client);

    // /contentbrowser/projects/{project_full_name}/{branch_name}/{asset_ref}?{filter}{paging}
    server.get(/^\/contentbrowser\/projects\/([^/]*)\/([^/]*)\/([^/]*)\/((?:assets|resources)\/.*)/, function(req, res, next) {
        const handler = create_handler(req, res, next);
        const organization = req.params[0];
        const name = req.params[1];
        const branch_name = req.params[2];
        const asset_ref = req.params[3];
        const options = {
            filterName: req.query.uri,
            maxResults: parseInt(req.query.maxResults, 10),
            start: parseInt(req.query.start, 10)
        };
        project.contents(organization, name, branch_name, asset_ref, options)
            .then(project => {
                handler.sendJSON(project, 200);
            })
            .catch(err => handler.sendError(err));

    });

    // /contentbrowser/projects/{project_full_name}?{filter}{paging}
    server.get(/^\/contentbrowser\/projects\/([^/]*)?(?:\/)?([^/]*)?\/branches\/(.*)/, function(req, res, next) {
        const handler = create_handler(req, res, next);
        const project_full_name = `${req.params[0]}/${req.params[1]}`;
        const branch = req.params[2];
        const options = {
            filterName: req.query.name,
            maxResults: parseInt(req.query.maxResults, 10),
            start: parseInt(req.query.start, 10)
        };

        project.branches(project_full_name, branch, options)
            .then(project => {
                handler.sendJSON(project, 200);
            })
            .catch(err => handler.sendError(err));
    });

    // /contentbrowser/projects/{project_full_name}?{filter}{paging}
    server.get(/^\/contentbrowser\/projects\/?([^/]*)?(?:\/)?([^/]*)?/, function(req, res, next) {
        const handler = create_handler(req, res, next);
        const organization = req.params[0];
        const name = req.params[1];
        const options = {
            filterName: req.query.name,
            maxResults: parseInt(req.query.maxResults, 10),
            start: parseInt(req.query.start, 10)
        };

        project.list(organization, name, options)
            .then(project => {
                handler.sendJSON(project, 200);
            })
            .catch(err => handler.sendError(err));
    });
};
