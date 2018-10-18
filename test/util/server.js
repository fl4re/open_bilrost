/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const restify = require('restify');
const bunyan = require('bunyan');
const supertest = require('supertest');

const port_factory = require('./port_factory');

const controllers = require('../../controllers');
const amazon_client = require('../../lib/amazon-client');
const cache = require('../../lib/cache');
const favorite = require('../../lib/favorite');


module.exports = fixture => {
    const default_parameters = {
        bilrost_client: {},
        protocol: 'https',
        cache_path: fixture.get_cache_path(),
        config_path: fixture.get_config_path()
    };
    return {
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
                favorite: favorite(parameters.config_path),
                protocol: parameters.protocol
            };

            return new Promise(resolve => {
                server.listen(port, () => {
                    controllers(server, context);
                    resolve(client);
                });
            });
        }
    };
};
