/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _url = require('url');

const create_handler = require('../lib/handler');

const errors = require('../lib/errors')('asset manager');

// Utility to create the next reference url for paging
const get_next_url = (url, next) => {
    let parsed_url = _url.parse(url, true);
    parsed_url.query.start = next;
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
            handler.handleError(errors('Asset').RESTRICTED('.bilrost directory'));
        }
        try {
            const workspace = await _workspace.find(workspace_identifier);
            let options = {
                filterName: req.query.uri,
                maxResults: parseInt(req.query.maxResults, 10),
                start: parseInt(req.query.start, 10),
                q: req.query.q
            };
            const resource = await workspace.resource.get(ref, options);
            let output = resource.output;
            if (resource.indexOfMoreResults) {
                output.nextLink = get_next_url(req.url, resource.indexOfMoreResults);
            }
            if (output.header) {
                for (let i = 0, keys = Object.keys(output.header); i<keys.length; i++) {
                    res.header(keys[i], output.header[keys[i]]);
                }
                delete output.header;
            }
            handler.sendJSON(output, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

};
