/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const restify = require('restify');

module.exports = function(options) {
    const server = restify.createServer({
        name: 'Bilrost',
        log: options.logger
    });

    // Set timeout to 10 hours since we cannot disable it
    server.server.setTimeout(60000 * 60 * 10);

    server.use(restify.queryParser()); // split arguments in req.query
    server.use(restify.bodyParser()); // POST,PUT mapped in req.body
    server.use(restify.dateParser()); // parse dates into javascript date format
    restify.defaultResponseHeaders = false;

    restify.CORS.ALLOW_HEADERS.push('accept');
    restify.CORS.ALLOW_HEADERS.push('sid');
    restify.CORS.ALLOW_HEADERS.push('lang');
    restify.CORS.ALLOW_HEADERS.push('origin');
    restify.CORS.ALLOW_HEADERS.push('withcredentials');
    restify.CORS.ALLOW_HEADERS.push('x-requested-with');
    restify.CORS.ALLOW_HEADERS.push('Accept-Encoding');
    restify.CORS.ALLOW_HEADERS.push('Accept-Language');
    restify.CORS.ALLOW_HEADERS.push('authorization');
    restify.CORS.ALLOW_HEADERS.push('x-api-version');
    restify.CORS.ALLOW_HEADERS.push('x-customheader');
    restify.CORS.ALLOW_HEADERS.push('x-forwarded-for');
    restify.CORS.ALLOW_HEADERS.push('x-real-ip');
    restify.CORS.ALLOW_HEADERS.push('user-agent');
    restify.CORS.ALLOW_HEADERS.push('keep-alive');
    restify.CORS.ALLOW_HEADERS.push('host');
    restify.CORS.ALLOW_HEADERS.push('connection');
    restify.CORS.ALLOW_HEADERS.push('upgrade');
    restify.CORS.ALLOW_HEADERS.push('content-type');
    restify.CORS.ALLOW_HEADERS.push('dnt'); // Do not track
    restify.CORS.ALLOW_HEADERS.push('if-modified-since');
    restify.CORS.ALLOW_HEADERS.push('cache-control');
    restify.CORS.ALLOW_HEADERS.push('x-session-id');

    server.use(restify.CORS());

    function unknownMethodHandler(req, res) {
        // eslint-disable-next-line no-console
        console.log('unkownMethodHandler method=' + req.method.toLowerCase());
        if (req.method.toLowerCase() === 'options') {
            if (res.methods.indexOf('OPTIONS') === -1) {
                res.methods.push('OPTIONS');
            }
            res.header('Access-Control-Allow-Credentials', true);
            res.header('Access-Control-Allow-Headers', restify.CORS.ALLOW_HEADERS.join(', '));
            res.header('Access-Control-Allow-Methods', res.methods.join(', '));
            res.header('Access-Control-Allow-Origin', req.headers.origin);
            res.header('Access-Control-Max-Age', 0);
            res.header('Content-type', 'text/plain charset=UTF-8');
            res.header('Content-length', 0);

            return res.send(204);
        } else {
            return res.send(new restify.MethodNotAllowedError());
        }
    }

    server.on('MethodNotAllowed', unknownMethodHandler);

    return server;
};
