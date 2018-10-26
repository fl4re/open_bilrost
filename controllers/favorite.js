/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const create_handler = require('../lib/handler');
const _workspace_metadata_presenter = require('../assetmanager/workspace_presenter').Workspace_metadata_presenter;

module.exports = function(server, context) {
    const favorite = context.favorite;
    const _workspace = require('../assetmanager/workspace')(context);

    server.post('/assetmanager/favorites', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
        const workspace_name = req.body.name;
        try {
            const workspace = await _workspace.find_by_file_uri(workspace_file_uri);
            await workspace.check_overall_validation();
            await favorite.add({ name: workspace_name, file_uri: workspace.get_file_uri()});
            handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace');
        } catch (workspace) {
            handler.sendError(workspace);
        }
    });

    server.del('/assetmanager/favorites/:identifier', async (req, res, next) => {
        const workspace_identifier = req.params.identifier;
        const handler = create_handler(req, res, next);
        try {
            await favorite.remove(workspace_identifier);
            handler.sendText('Ok', 200);
        } catch (workspace) {
            handler.sendError(workspace.error || workspace);
        }
    });

    server.post('/assetmanager/favorites/reset', async (req, res, next) => {
        const handler = create_handler(req, res, next);
        try {
            await favorite.flush();
            handler.sendText('Ok', 200);
        } catch (err) {
            handler.sendError(err);
        }
    });
};
