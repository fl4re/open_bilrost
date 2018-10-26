/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const create_handler = require('../lib/handler');

module.exports = (server, config) => {
    server.get('/config', function(req, res, next) {
        const handler = create_handler(req, res, next);
        try {
            const conf = config.get_all();
            handler.sendJSON(conf, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.get('/config/:key', function(req, res, next) {
        const handler = create_handler(req, res, next);
        try {
            const key = req.params.key;
            const value = config[key] || 'N/A';
            handler.sendJSON(value, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.put('/config/:key', function(req, res, next) {
        const handler = create_handler(req, res, next);
        try {
            const key = req.params.key;
            const new_value = req.body.value;
            config[key] = new_value;
            handler.sendJSON('Ok', 204);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.del('/config/:key', function(req, res, next) {
        const handler = create_handler(req, res, next);
        try {
            const key = req.params.key;
            config.del(key);
            handler.sendJSON('Ok', 204);
        } catch (err) {
            handler.handleError(err);
        }
    });
};
