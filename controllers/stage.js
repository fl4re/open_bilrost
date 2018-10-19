/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get('/assetmanager/workspaces/:identifier/stage', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            const stage = await workspace.get_stage();
            handler.sendJSON({ items: stage }, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.del('/assetmanager/workspaces/:identifier/stage', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.empty_stage();
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    const ref_stage_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/stage(\/(?:assets|resources)\/.*)/;

    server.post(ref_stage_regexp, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const asset_ref = decodeURIComponent(req.params[1]);

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.add_asset_to_stage(asset_ref);
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.del(ref_stage_regexp, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const asset_ref = decodeURIComponent(req.params[1]);

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.remove_asset_from_stage(asset_ref);
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });
};
