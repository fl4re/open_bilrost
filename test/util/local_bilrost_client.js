/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

module.exports = port => new Promise((resolve, reject) => {
    const PORT = port || require('./port_factory')();
    const s3config = require('config').get('S3');
    const CFconfig = require('config').get('CF');
    const bilrost_server_config = {
        predefined_sessions: {
            '1234': {
                login: 'fake_user_name',
                teams: [{slug: 'cloud'}],
                access_token: 'this_is_a_test_access_token',
                orgs: [{ login: 'test' }]
            }
        },
        registry_url: 'not used here',
        github: {
            teams: ['cloud'],
            organizations: ['fl4re', 'test']
        },
        S3: s3config,
        CF: CFconfig
    };

    const bilrost_client = require('../../lib/bilrost-client')('http://localhost:' + PORT, __dirname);
    /* setup a bilrost server */
    const bilrost_server = require('open_bilrost_server');
    const restify = require('restify');
    const server = restify.createServer({});
    server.use(restify.bodyParser());
    bilrost_server(server, bilrost_server_config);
    server.listen(PORT, err => {
        if (err) {
            reject(err);
        } else {
            resolve(bilrost_client);
        }
    });

});
