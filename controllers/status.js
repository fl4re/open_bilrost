/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const status_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/status$/;
const statuses_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/statuses$/;
const ref_status_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/status(\/(?:assets|resources)\/.*)/;

const sanitize = function(query_argument) {
    if (query_argument === undefined) {
        query_argument = '';
    }
    return decodeURIComponent(query_argument);
};

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get(status_regexp, function(req, res, next) {
        const workspace_identifier = sanitize(req.params[0]);
        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.check_overall_validation()
                .then(() => workspace.get_status())
            )
            .then(full_status => handler.sendJSON(full_status, 200))
            .catch(full_status => handler.handleError(full_status));
    });

    server.get(statuses_regexp, function(req, res, next) {
        const workspace_identifier = sanitize(req.params[0]);
        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.update_and_retrieve_status())
            .then(statuses => handler.sendJSON(statuses, 200))
            .catch(statuses => handler.handleError(statuses));
    });

    server.get(ref_status_regexp, function(req, res, next) {
        const workspace_identifier = sanitize(req.params[0]);
        const ref = decodeURIComponent(req.params[1]);
        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.get_ref_status(ref))
            .then(ref_status => handler.sendJSON(ref_status, 200))
            .catch(ref_status => handler.handleError(ref_status));
    });
};
