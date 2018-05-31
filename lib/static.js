/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const send = require('send');
const Handler = require('./handler');

module.exports = function (server) {
    server.static = (options) => {
        const route = options.route;
        const base_dir = options.base_dir;

        server.get(new RegExp("/" + route + "(.*)"), function (req, res, next) {

            const filename = req.params[0].split('\?')[0];

            const error = (err) => {
                console.log('sendFile error - assuming file not found error');
                const handler = new Handler(req, res, next);
                handler.handleError({message: err.stack, statusCode: 404});
            };

            send(req, filename, {root: base_dir})
                .on('error', error)
                .pipe(res)
                .on('end', next);
        });
    };
};
