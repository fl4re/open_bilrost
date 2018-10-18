/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*

This modules aims to provide a rest api for creating, importing, organizing, viewing,
and modifying content assets. This is providing a back end layer to the content browser

It deals with notion of workspace and assets. See following docs for more information
*/
'use strict';

const Handler = require('../lib/handler');
const _path = require('path').posix;

const projects_regexp = /^\/contentbrowser\/projects\/([^/]*)?(?:\/)?([^/]*)?/;
const projects_assets_regexp = /^\/contentbrowser\/projects\/([^/]*)\/([^/]*)(?:\/)?(.*)?\/(assets\/.*)/;
const projects_resources_regexp = /^\/contentbrowser\/projects\/([^/]*)\/([^/]*)(?:\/)?(.*)?\/(resources\/.*)/;

const sanitize = function(query_argument) {
    if (query_argument === undefined) {
        query_argument = '';
    }
    return query_argument;
};

module.exports = function(server, context) {
    const Project = require('../assetmanager/project_manager')(context);
    
    // /contentbrowser/projects/{project_full_name}/{branch_name}/{asset_ref}?{filter}{paging}
    server.get(projects_assets_regexp, function(req, res, next) {
        let handler = new Handler(req, res, next);
        let organization = sanitize(req.params[0]);
        let name = sanitize(req.params[1]);
        let branch_name = sanitize(req.params[2]);
        let asset_ref = sanitize(req.params[3]);
        let options = {
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
    server.get(projects_resources_regexp, function(req, res, next) {
        res.status(501);
        res.end();
        next();
    });

    // /contentbrowser/projects/{project_full_name}?{filter}{paging}
    server.get(projects_regexp, function(req, res, next) {
        let handler = new Handler(req, res, next);
        let org = sanitize(req.params[0]);
        let project_name = sanitize(req.params[1]);
        let options = {
            filterName: req.query.name,
            maxResults: parseInt(req.query.maxResults, 10),
            start: parseInt(req.query.start, 10)
        };

        var identifier = _path.join(org+'/', project_name);
        Project.get(identifier, options)
            .then(project => {
                handler.sendJSON(project, 200);
            })
            .catch(err => handler.handleError(err));
    });

};
