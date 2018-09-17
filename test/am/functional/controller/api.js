/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const bilrost = require('../../../util/bilrost');

let client;

describe('Run functional tests for the API Description', function () {

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start();
    });

    describe('API description', function() {
        it('Retrieve information about Asset Manager API', function(done) {

            client
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
