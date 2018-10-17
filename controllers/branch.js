/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const create_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)$/;
const delete_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)$/;
const change_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)\/change$/;

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.post(change_branch_regexp, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const branch_name = decodeURIComponent(req.params[1]);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.branch.change(branch_name);
            handler.sendJSON('Ok', 200);
        } catch (workspace) {
            handler.handleError(workspace.error);
        }
    });

    server.put(create_branch_regexp, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const branch_name = decodeURIComponent(req.params[1]);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.branch.create(branch_name);
            handler.sendJSON('created', 201);
        } catch (workspace) {
            handler.handleError(workspace.error);
        }
    });

    server.del(delete_branch_regexp, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const branch_name = decodeURIComponent(req.params[1]);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.branch.del(branch_name);
            handler.sendJSON('removed', 200);
        } catch (workspace)  {
            handler.handleError(workspace.error);
        }
    });
};
