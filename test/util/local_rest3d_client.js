/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

module.exports = port => new Promise((resolve, reject) => {
    const PORT = port || require('./port_factory')();
    const s3config = require('config').get('S3');
    const CFconfig = require('config').get('CF');
    const rest3d_server_config = {
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

    const rest3d_client = require('../../lib/rest3d-client')('http://localhost:' + PORT, __dirname);
    /* setup a rest3d server */
    const bilrost_server = require('open_bilrost_server');
    const restify = require('restify');
    const rest3d_server = restify.createServer({});
    rest3d_server.use(restify.bodyParser());
    bilrost_server(rest3d_server, rest3d_server_config);
    rest3d_server.listen(PORT, err => {
        if (err) {
            reject(err);
        } else {
            resolve(rest3d_client);
        }
    });

});
