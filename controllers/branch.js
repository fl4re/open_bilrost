/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const current_branch_regexp = /^\/contentbrowser\/workspaces\/(.*)\/branch$/;

const create_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)$/;
const delete_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)$/;
const change_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)\/change$/;
const branches_regexp = /^\/contentbrowser\/workspaces\/(.*)\/branches$/;

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get(current_branch_regexp, (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        _workspace.find(workspace_identifier)
            .then(workspace => handler.sendJSON(workspace.get_branch(), 200))
            .catch(err => handler.handleError(err));
    });

    server.get(branches_regexp, function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        _workspace.find(workspace_identifier)
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
