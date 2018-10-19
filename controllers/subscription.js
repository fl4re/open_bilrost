/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get('/assetmanager/workspaces/:identifier/subscriptions', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            const subscriptions = await workspace.get_subscriptions();
            handler.sendJSON({ subscriptions }, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.post('/assetmanager/workspaces/:identifier/subscriptions', async (req, res, next) => {
        const workspace_identifier = req.params.identifier;
        const req_type = req.body.type;
        const req_descriptor = req.body.descriptor;

        const handler = new Handler(req, res, next);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            const subscription = await workspace.add_subscription(req_type, req_descriptor);
            handler.sendJSON(subscription, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.del('/assetmanager/workspaces/:identifier/subscriptions', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.remove_all_subscriptions();
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.del('/assetmanager/workspaces/:identifier/subscriptions/:sub_id', async (req, res, next) => {
        const handler = new Handler(req, res, next);

        const workspace_identifier = req.params.identifier;
        const subscription_identifier = req.params.sub_id;
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.remove_subscription(subscription_identifier);
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });
};
