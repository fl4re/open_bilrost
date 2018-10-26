/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _path = require('path').posix;
const _url = require('url');

const _asset = require('../assetmanager/asset');
const create_handler = require('../lib/handler');

const assets_regexp = /^\/assetmanager\/workspaces\/([^/]*)(\/assets\/.*)/;
const assets_rename_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/rename(\/assets\/.*)/;
const workspaces_assets_regexp = /^\/contentbrowser\/workspaces\/([^/]*)(\/assets\/.*)/;
const workspaces_resources_regexp = /^\/contentbrowser\/workspaces\/([^/]*)(\/resources\/.*)/;

const errors = require('../lib/errors')('asset manager');

const sanitize = function(query_argument) {
    if (query_argument === undefined) {
        query_argument = '';
    }
    return decodeURIComponent(query_argument);
};

// Utility to create the next reference url for paging
const get_next_url = (url, next) => {
    let parsed_url = _url.parse(url, true);
    parsed_url.query.start = next;
    parsed_url.search = undefined;  // If search is set it prevails over the query, we must unset it
    return parsed_url.format();
};

// Get extension from path
const substr_ext = path => _path.extname(path).split('.').join('');

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    // WORKSPACES
    server.get(workspaces_assets_regexp, function(req, res, next) {
        const handler = create_handler(req, res, next);
        let workspace_identifier = decodeURIComponent(req.params[0]);
        let asset_ref = decodeURIComponent(req.params[1]);
        _workspace.find(workspace_identifier)
            .then(workspace => {
                let options = {
                    filterName: req.query.ref,
                    maxResults: parseInt(req.query.maxResults, 10),
                    start: parseInt(req.query.start, 10),
                    q: req.query.q
                };
                return _asset.find_asset_by_ref(workspace, asset_ref, options)
                    .then(asset => {
                        let output = asset.output;
                        if (asset.indexOfMoreResults) {
                            output.nextLink = get_next_url(req.url, asset.indexOfMoreResults);
                        }
                        handler.sendJSON(output, 200, substr_ext(asset_ref));
                    })
                    .catch(error => {throw({error: error});});
            }).catch(err => handler.handleError(err));
    });

    server.get(workspaces_resources_regexp, function(req, res, next) {
        let workspace_identifier = decodeURIComponent(req.params[0]);
        let ref = decodeURIComponent(req.params[1]);

        let handler = create_handler(req, res, next);
        if (ref.split('.bilrost').length > 1) {
            handler.handleError(errors('Asset').RESTRICTED('.bilrost directory'));
        }
        _workspace.find(workspace_identifier)
            .then(function(workspace) {
                let options = {
                    filterName: req.query.uri,
                    maxResults: parseInt(req.query.maxResults, 10),
                    start: parseInt(req.query.start, 10),
                    q: req.query.q
                };
                return workspace.resource.get(ref, options)
                    .then(function(resource) {
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

    server.put(assets_regexp, async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        const modified = sanitize(req.headers['last-modified']);
        const asset_representation = req.body;
        const workspace = await _workspace.find(workspace_identifier);
        try {
            await workspace.check_overall_validation();
            const asset = await workspace.asset.create(asset_ref, asset_representation);
            handler.sendJSON(asset, 201);
        } catch (error) {
            if (error && error.statusCode === 403) {
                try {
                    const asset = await workspace.asset.replace(asset_ref, asset_representation, modified);
                    handler.sendJSON(asset, 200);
                } catch (error) {
                    handler.handleError(error);
                }
            } else {
                handler.handleError(error);
            }
        }
    });

    server.post(assets_rename_regexp, async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        const modified = sanitize(req.headers['last-modified']);
        const new_asset_ref = req.body.new;
        let workspace;
        try {
            workspace = await _workspace.find(workspace_identifier);
            await workspace.check_overall_validation();
            const asset = await workspace.asset.rename(asset_ref, new_asset_ref, modified);
            handler.sendJSON(asset, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.del(assets_regexp, async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.check_overall_validation();
            await workspace.asset.delete(asset_ref);
            const workspaces = workspace.get_subscriptions();
            const sub_id = workspaces.find(({ ref }) => ref === asset_ref);
            await workspace.remove_subscription(sub_id);
            handler.sendText('Ok', 204);
        } catch (error) {
            handler.handleError(error);
        }
    });
};
