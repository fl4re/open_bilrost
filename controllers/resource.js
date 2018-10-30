/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _url = require('url');

const create_handler = require('../lib/handler');

const errors = require('../lib/errors')('asset manager');
const ifs_util = require('../ifs/utilities');

// Utility to create the next reference url for paging
const get_next_url = (url, start, max) => {
    let parsed_url = _url.parse(url, true);
    parsed_url.query.start = start + max;
    parsed_url.query.maxResults = max;
    parsed_url.search = undefined;  // If search is set it prevails over the query, we must unset it
    return parsed_url.format();
};

module.exports = function(server, context) {
    const _workspace = require('../assetmanager/workspace')(context);

    server.get(/^\/contentbrowser\/workspaces\/([^/]*)(\/resources\/.*)/, async (req, res, next) => {
        let workspace_identifier = decodeURIComponent(req.params[0]);
        let ref = decodeURIComponent(req.params[1]);

        let handler = create_handler(req, res, next);
        if (ref.split('.bilrost').length > 1) {
            handler.sendError(errors('Asset').RESTRICTED('.bilrost directory'));
        }
        try {
            const workspace = await _workspace.find(workspace_identifier);
            let options = {
                filterName: req.query.uri,
                maxResults: parseInt(req.query.maxResults, 10) || 100,
                start: parseInt(req.query.start, 10) || 0,
                q: req.query.q
            };
            const result = options.q ? await workspace.resource.find(ref, options.q) : await workspace.resource.get(ref);
            if (result.items) {
                result.totalItems = result.items.length;
                result.items = options.filterName ? ifs_util.filter_name(result.items, options.filterName) : result.items;
                result.items = ifs_util.slice(result.items, options.start, options.maxResults);
                if (options.start + result.items.length < result.totalItems) {
                    result.nextLink = get_next_url(req.url, options.start, options.maxResults);
                }
            }
            if (result.modified) {
                res.header('Last-Modified', result.modified);
            }
            if (result.etag) {
                res.header('Etag', result.etag);
            }
            handler.sendJSON(result, 200);
        } catch (err) {
            handler.sendError(err);
        }
    });

};
