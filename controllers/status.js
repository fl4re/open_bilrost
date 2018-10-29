/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const create_handler = require('../lib/handler');

const sanitize = function(query_argument) {
    if (query_argument === undefined) {
        query_argument = '';
    }
    return decodeURIComponent(query_argument);
};

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get('/assetmanager/workspaces/:identifier/status', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.check_overall_validation();
            const full_status = await workspace.get_status();
            handler.sendJSON(full_status, 200);
        } catch (err) {
            handler.sendError(err);
        }
    });

    server.get('/assetmanager/workspaces/:identifier/statuses', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            const statuses = await workspace.update_and_retrieve_status();
            handler.sendJSON(statuses, 200);
        } catch (err) {
            handler.sendError(err);
        }
    });

    server.get(/^\/assetmanager\/workspaces\/([^/]*)\/status(\/(?:assets|resources)\/.*)/, async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const ref = sanitize(req.params[1]);

        try {
            const workspace = await _workspace.find(workspace_identifier);
            const ref_status = await workspace.get_ref_status(ref);
            handler.sendJSON(ref_status, 200);
        } catch (err) {
            handler.sendError(err);
        }
    });
};
