/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const stage_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/stage$/;
const ref_stage_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/stage(\/(?:assets|resources)\/.*)/;

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get(stage_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.get_stage())
            .then(stage => handler.sendJSON({items: stage}, 200))
            .catch(err => handler.handleError(err));
    });

    server.del(stage_regexp, async (req, res, next) => {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const handler = new Handler(req, res, next);

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.empty_stage();
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.post(ref_stage_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const asset_ref = decodeURIComponent(req.params[1]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.add_asset_to_stage(asset_ref))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(err => handler.handleError(err));
    });

    server.del(ref_stage_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const asset_ref = decodeURIComponent(req.params[1]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.remove_asset_from_stage(asset_ref))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(err => handler.handleError(err));
    });
};
