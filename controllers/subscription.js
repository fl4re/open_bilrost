/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const subscriptions_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/subscriptions$/;
const id_subscriptions_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/subscriptions\/([^/]*)/;

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get(subscriptions_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.get_subscriptions())
            .then(subscriptions => handler.sendJSON({subscriptions: subscriptions}, 200))
            .catch(err => handler.handleError(err));
    });

    server.post(subscriptions_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const req_type = req.body.type;
        const req_descriptor = req.body.descriptor;

        const handler = new Handler(req, res, next);
        _workspace.find(workspace_identifier)
            .then(workspace => workspace.add_subscription(req_type, req_descriptor))
            .then(subscription => handler.sendJSON(subscription, 200))
            .catch(err => handler.handleError(err));
    });

    server.del(subscriptions_regexp, async (req, res, next) => {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const handler = new Handler(req, res, next);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.remove_all_subscriptions();
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.del(id_subscriptions_regexp, async (req, res, next) => {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        let subscription_identifier = decodeURIComponent(req.params[1]);
        const handler = new Handler(req, res, next);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.remove_subscription(subscription_identifier);
            handler.sendJSON('Ok', 200);
        } catch (err) {
            handler.handleError(err);
        }
    });
};
