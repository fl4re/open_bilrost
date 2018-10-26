/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const create_handler = require('../lib/handler');

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get('/contentbrowser/workspaces/:identifier/branch', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = req.params.identifier;
        try {
            const workspace = await _workspace.find(workspace_identifier);
            handler.sendJSON(workspace.get_branch(), 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.get('/contentbrowser/workspaces/:identifier/branches', function(req, res, next) {
        const handler = create_handler(req, res, next);
        const workspace_identifier = req.params.identifier;
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

    server.post('/assetmanager/workspaces/:identifier/branch/:name/change', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = req.params.identifier;
        const branch_name = req.params.name;
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.branch.change(branch_name);
            handler.sendText('Ok', 200);
        } catch (workspace) {
            handler.handleError(workspace.error);
        }
    });

    server.put('/assetmanager/workspaces/:identifier/branch/:name', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = req.params.identifier;
        const branch_name = req.params.name;
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.branch.create(branch_name);
            handler.sendText('created', 201);
        } catch (workspace) {
            handler.handleError(workspace.error);
        }
    });

    server.del('/assetmanager/workspaces/:identifier/branch/:name', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_identifier = req.params.identifier;
        const branch_name = req.params.name;
        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.branch.del(branch_name);
            handler.sendText('removed', 200);
        } catch (workspace)  {
            handler.handleError(workspace.error);
        }
    });
};
