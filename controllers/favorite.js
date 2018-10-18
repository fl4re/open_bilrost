/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const _workspace_metadata_presenter = require('../assetmanager/workspace_presenter').Workspace_metadata_presenter;

const favorites_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/favorites$/;

module.exports = function(server, context) {
    const favorite = context.favorite;
    const _workspace = require('../assetmanager/workspace')(context);

    server.del(favorites_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const handler = new Handler(req, res, next);
        _workspace.find(workspace_identifier)
            .then(workspace => favorite.remove(workspace.get_name()).then(() => workspace.database.close()), () => favorite.remove(req.params[0]))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(workspace => handler.handleError(workspace.error || workspace));
    });

    server.post('/assetmanager/workspaces/favorites', function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
        _workspace.find_by_file_uri(workspace_file_uri)
            .then(workspace => workspace.check_overall_validation()
                .then(() => favorite.add({ name: workspace.get_name(), file_uri: workspace.get_file_uri()}))
                .then(() => handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace')))
            .catch(workspace => {
                handler.handleError(workspace);
            });
    });

    server.post('/assetmanager/workspaces/favorites/reset', function(req, res, next) {
        const handler = new Handler(req, res, next);
        favorite.flush()
            .then(() => handler.sendJSON('Ok', 200))
            .catch(handler.handleError);
    });
};
