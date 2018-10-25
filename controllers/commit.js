/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const create_handler = require('../lib/handler');

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get(/^\/assetmanager\/workspaces\/([^/]*)\/commits(\/(?:assets|resources)\/.*)?$/, async (req, res, next) => {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const ref = req.params[1] ? decodeURIComponent(req.params[1]) : undefined;
        const maxResults = req.query.maxResults ? parseInt(req.query.maxResults, 10) : 10;
        const start_at_revision = req.query.start_at_revision;

        const handler = create_handler(req, res, next);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            const items = ref ? await workspace.get_commit_log(ref, start_at_revision, maxResults) : await workspace.get_commit_logs(start_at_revision, maxResults);
            const nextLink = '/assetmanager/workspaces/' + workspace_identifier + '/commits/' + (ref ? ref : '') +
                '?maxResults=' + maxResults + (items.length > 0 ? ('&start_at_revision=' + items[items.length-1].id) : '');
            handler.sendJSON({
                nextLink,
                items
            }, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.post('/assetmanager/workspaces/:identifier/commits', async (req, res, next) => {
        const workspace_identifier = req.params.identifier;
        const message = req.body.message;

        const handler = create_handler(req, res, next);
        try {
            const workspace = await _workspace.find(workspace_identifier);
            const commit_id = await workspace.commit_files(message);
            handler.sendText(commit_id, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

};
