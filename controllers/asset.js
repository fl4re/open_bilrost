/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const assets_regexp = /^\/assetmanager\/workspaces\/([^/]*)(\/assets\/.*)/;
const assets_rename_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/rename(\/assets\/.*)/;

const errors = require('../lib/errors')('asset manager');

const sanitize = function(query_argument) {
    if (query_argument === undefined) {
        query_argument = '';
    }
    return decodeURIComponent(query_argument);
};

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.put(assets_regexp, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        const modified = sanitize(req.headers['last-modified']);
        const is_body_a_json_to_parse = typeof req.body === 'string' || req.body instanceof Buffer;
        let asset_representation;
        try {
            asset_representation = is_body_a_json_to_parse ? JSON.parse(req.body) : req.body;
        } catch (err) {
            return handler.handleError(errors.CORRUPT(err));
        }
        const workspace = await _workspace.find(workspace_identifier);
        try {
            await workspace.check_overall_validation();
            const asset = await workspace.asset.create(asset_ref, asset_representation);
            return handler.sendJSON(asset, 201);
        } catch (error) {
            if (error && error.statusCode === 403) {
                try {
                    const asset = await workspace.asset.replace(asset_ref, asset_representation, modified);
                    return handler.sendJSON(asset, 200);
                } catch (error) {
                    return handler.handleError(error);
                }
            } else {
                return handler.handleError(error);
            }
        }
    });

    server.post(assets_rename_regexp, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        const modified = sanitize(req.headers['last-modified']);
        var new_asset_ref;
        try {
            new_asset_ref = JSON.parse(req.body).new;
        } catch (err) {
            return handler.handleError(errors.CORRUPT(err));
        }
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
        const handler = new Handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.check_overall_validation();
            await workspace.asset.delete(asset_ref);
            const workspaces = workspace.get_subscriptions();
            const sub_id = workspaces.find(({ ref }) => ref === asset_ref);
            await workspace.remove_subscription(sub_id);
            handler.sendJSON('Ok', 204);
        } catch (error) {
            handler.handleError(error);
        }
    });
};
