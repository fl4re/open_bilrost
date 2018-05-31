/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Test_util = require('../../../util/test_util');

var test_util = new Test_util("api", "api");

describe('Run functional tests for the API Description', function () {

    before("Starting a Content Browser server", done => test_util.start_server(done));

    describe('API description', function () {
        it('Retrieve information about Asset Manager API', function(done) {
            
            test_util.client
                .get('/assetmanager')
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });
    });
});
