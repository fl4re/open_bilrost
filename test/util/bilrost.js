/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const path = require('path').posix;
const restify = require('restify');
const bunyan = require('bunyan');
const supertest = require('supertest');

const port_factory = require('./port_factory');

const asset_manager = require('../../assetmanager');
const content_browser = require('../../contentbrowser');
const amazon_client = require('../../lib/amazon-client');
const cache = require('../../lib/cache');

const default_cache_path = path.join(__dirname.replace(/\\/g, '/'), '..', '..', 'tmp', 'Cache');
const default_parameters = {
    bilrost_client: {},
    protocol: 'https',
    cache_path: default_cache_path
};

module.exports = {
    start: (parameters = {}) => {
        const defaults = Object.create(default_parameters);
        parameters = Object.assign(defaults, parameters);

        // Bilrost server
        const port = port_factory();
        const log = bunyan.createLogger({
            name: 'controller_test',
            stream: process.stdout,
            level: 'info'
        });
        const server = restify.createServer({
            log
        });
        server.use(restify.queryParser());
        server.use(restify.bodyParser());
        const client = supertest(server);

        // Context
        const context = {
            bilrost_client: parameters.bilrost_client,
            amazon_client: amazon_client(parameters.bilrost_client),
            cache: cache(parameters.cache_path),
            protocol: parameters.protocol
        };

        return new Promise(resolve => {
            server.listen(port, () => {
                asset_manager(server, context);
                content_browser(server, context);
                resolve(client);
            });
        });
    }
};
