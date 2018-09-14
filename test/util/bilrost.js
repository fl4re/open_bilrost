/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const restify = require('restify');
const bunyan = require('bunyan');
const supertest = require('supertest');

const port_factory = require('./port_factory');

const asset_manager = require('../../assetmanager');
const content_browser = require('../../contentbrowser');
const amazon_client = require('../../lib/amazon-client');
const cache = require('../../lib/cache');

module.exports = {
    start: (parameters = { bilrost_client: {}, protocol: 'https', cache_path: '' }) => {

        // Bilrost server
        const port = port_factory();
        const logger = bunyan.createLogger({
            name: 'controller_test',
            stream: process.stdout,
            level: 'info'
        });
        const server = restify.createServer({
            log: logger
        });

        // Context
        const context = {
            bilrost_client: parameters.bilrost_client,
            amazon_client: amazon_client(parameters.bilrost_client),
            cache: cache(parameters.cache_path),
            protocol: parameters.protocol
        };

        server.use(restify.queryParser());
        server.use(restify.bodyParser());

        return new Promise((resolve, reject) => {
            server.listen(port, () => {
                const client = supertest(server);
                asset_manager(server, context);
                content_browser(server, context);
                resolve(client);
            });
        });
    }
};
