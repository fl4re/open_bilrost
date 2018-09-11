/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*

This modules aims to provide a rest api for creating, importing, organizing, viewing,
and modifying content assets. This is providing a back end layer to the content browser

It deals with notion of workspace and assets. See following docs for more information
*/
'use strict';

const Asset = require('./assetmanager/asset');
const Handler = require('./lib/handler');
const errors = require('./lib/errors');
const Workspace_presenter = require("./assetmanager/workspace_presenter").Workspace_presenter;

const _url = require('url');
const _path = require('path').posix;

const projects_regexp = /^\/contentbrowser\/projects\/([^\/]*)?(?:\/)?([^\/]*)?/;
const projects_assets_regexp = /^\/contentbrowser\/projects\/([^\/]*)\/([^\/]*)(?:\/)?(.*)?\/(assets\/.*)/;
const projects_resources_regexp = /^\/contentbrowser\/projects\/([^\/]*)\/([^\/]*)(?:\/)?(.*)?\/(resources\/.*)/;
const workspaces_regexp = /^\/contentbrowser\/workspaces(\/)?$/;
const workspace_regexp = /^\/contentbrowser\/workspaces\/([^\/]*)$/;
const worspaces_assets_regexp = /^\/contentbrowser\/workspaces\/([^\/]*)(\/assets\/.*)/;
const worspaces_resources_regexp = /^\/contentbrowser\/workspaces\/([^\/]*)(\/resources\/.*)/;
const current_branch_regexp = /^\/contentbrowser\/workspaces\/(.*)\/branch$/;
const branches_regexp = /^\/contentbrowser\/workspaces\/(.*)\/branches$/;

const sanitize = function (query_argument) {
    if (query_argument === undefined) {
        query_argument = '';
    }
    return query_argument;
};

// Utility for slicing a list of files
const slice = (files, start, number) => files.slice(start, start + number);

// Utility to create the next reference url for paging
const get_next_url = (url, next) => {
    let parsed_url = _url.parse(url, true);
    parsed_url.query.start = next;
    parsed_url.search = undefined;  // If search is set it prevails over the query, we must unset it
    return parsed_url.format();
};

// Get extension from path
const substr_ext = path => _path.extname(path).split('.').join('');

module.exports = function (server, context) {
    const Workspace = require('./assetmanager/workspace')(context);
    const Project = require('./assetmanager/project_manager')(context);

    // API DESCRIPTION

    server.get("/contentbrowser",  function (req, res, next) {
        new Handler(req, res, next).sendJSON({
            name: "Content browser",
            version: "1.1",
            url: "/contentbrowser",
            projects_url: "/contentbrowser/projects/",
            workspaces_url: "/contentbrowser/workspaces/",
            asset_types_url : "/contentbrowser/assets/types"
        }, 200);
    });

    // PROJECTS
    // /contentbrowser/projects/{project_full_name}/{branch_name}/{asset_ref}?{filter}{paging}
    server.get(projects_assets_regexp, function (req, res, next) {
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
    server.get(projects_resources_regexp, function (req, res, next) {
        res.status(501);
        res.end();
        next();
    });

    // /contentbrowser/projects/{project_full_name}?{filter}{paging}
    server.get(projects_regexp, function (req, res, next) {
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

    // WORKSPACES
    // /contentbrowser/workspaces/{workspace_id||workspace_name}/{asset_ref}?{q}{paging}
    server.get(worspaces_assets_regexp, function (req, res, next) {
        let handler = new Handler(req, res, next);
        let workspace_identifier = decodeURIComponent(req.params[0]);
        let asset_ref = decodeURIComponent(req.params[1]);
        Workspace.find(workspace_identifier)
            .then(workspace => {
                let options = {
                    filterName: req.query.ref,
                    maxResults: parseInt(req.query.maxResults, 10),
                    start: parseInt(req.query.start, 10),
                    q: req.query.q
                };
                return Asset.find_asset_by_ref(workspace, asset_ref, options)
                    .then(asset => {
                        let output = asset.output;
                        if (output.items) {
                            output.items = output.items.map(ass => {
                                ass.url = _path.join("/contentbrowser/workspaces/", workspace.get_guid(), ass.meta.ref);
                                return ass;
                            });
                        }
                        if (asset.indexOfMoreResults) {
                            output.nextLink = get_next_url(req.url, asset.indexOfMoreResults);
                        }
                        handler.sendJSON(output, 200, substr_ext(asset_ref));
                    })
                    .catch(error => {throw({error: error});});
            }).catch(err => handler.handleError(err));
    });

    // /contentbrowser/workspaces/{workspace_id||workspace_name}/{resource_ref}?{q}{paging}
    server.get(worspaces_resources_regexp, function (req, res, next) {
        let workspace_identifier = decodeURIComponent(req.params[0]);
        let ref = decodeURIComponent(req.params[1]);

        let handler = new Handler(req, res, next);
        if (ref.split('.bilrost').length > 1) {
            handler.handleError(errors('Asset').RESTRICTED('.bilrost directory'));
        }
        Workspace.find(workspace_identifier)
            .then(function (workspace) {
                let options = {
                    filterName: req.query.uri,
                    maxResults: parseInt(req.query.maxResults, 10),
                    start: parseInt(req.query.start, 10),
                    q: req.query.q
                };
                return workspace.resource.get(ref, options)
                    .then(function (resource) {
                        let output = resource.output;
                        if (resource.indexOfMoreResults) {
                            output.nextLink = get_next_url(req.url, resource.indexOfMoreResults);
                        }
                        if (output.header) {
                            for (let i = 0, keys = Object.keys(output.header); i<keys.length; i++) {
                                res.header(keys[i], output.header[keys[i]]);
                            }
                            delete output.header;
                        }
                        handler.sendJSON(output, 200);
                    });
             }).catch(err => handler.handleError(err));
    });

    server.get(current_branch_regexp, (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        Workspace.find(workspace_identifier)
            .then(workspace => handler.sendJSON(workspace.get_branch(), 200))
            .catch(err => handler.handleError(err));
    });

    server.get(branches_regexp, function (req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        Workspace.find(workspace_identifier)
            .then(workspace => workspace.branch.get_names())
            .then(branches => {
                const output = {
                    kind : "branch-list",
                    locals: branches.locals,
                    totalLocals: branches.locals.length,
                    remotes: branches.remotes,
                    totalRemotes: branches.remotes.length
                };
                handler.sendJSON(output, 200);
            })
            .catch(err => handler.handleError(err));
    });

    // /contentbrowser/workspaces?{filter}{paging}
    server.get(workspaces_regexp, function (req, res, next) {
        const handler = new Handler(req, res, next);
        const options = {
            filterName: req.query.name,
            maxResults: parseInt(req.query.maxResults, 10) || 100,
            start: parseInt(req.query.start, 10) || 0
        };
        Workspace
            .list(options)
            .then(workspaces => {
                const length = workspaces.length;
                workspaces = slice(workspaces, options.start, options.maxResults);
                const output = {
                    kind: 'workspace-list',
                    items: workspaces.map(workspace => Workspace_presenter.present(workspace))
                };
                if (options.start + workspaces.length < length) {
                    const indexOfMoreResults = options.start + options.maxResults;
                    output.nextLink = get_next_url(req.url, indexOfMoreResults);
                }
                output.totalItems = length;
                handler.sendJSON(output, 200);
            })
            .catch(err => handler.handleError(err));
    });

    // /contentbrowser/workspaces/{workspace_id||workspace_name}
    server.get(workspace_regexp, function (req, res, next) {
        let handler = new Handler(req, res, next);
        let workspace_identifier = decodeURIComponent(req.params[0]);
        if (!workspace_identifier) {
            return handler.handleError(new Error("Missing workspace id"));
        }

        Workspace.find(workspace_identifier)
            .then(workspace => {
                const output = {
                    kind: 'workspace-list',
                    items: [Workspace_presenter.present(workspace)]
                };
                output.totalItems = output.items.length;
                handler.sendJSON(output, 200);
            }).catch(err => handler.handleError(err));
    });

};
