/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');

const status_config = require('../../assetmanager/status.config.json');
const fixture = require('../util/fixture')('integration_status');
const workspace = require('../util/workspace')('eloise', fixture);
const bilrost = require('../util/server')(fixture);

describe('Run Status related functional tests for the API', function() {

    let client;

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start();
    });

    before("Creating fixtures", async function () {
        this.timeout(6000);
        await workspace.create('good_repo');
        workspace.create_workspace_resource();
        workspace.create_project_resource();
    });

    after("Removing fixtures", () => workspace.remove());

    describe('Retrieve Status', function() {
        it('Retrieve general Status of the Workspace', function(done) {
            this.timeout(7*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/status`)
                .expect('Content-Type', 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.equal(res.body.integrity_status, status_config.integrity.VALID);
                    should.equal(res.body.sync_status, status_config.sync.UP_TO_DATE);
                    done();
                });
        });

        it('Add Asset Subscription to Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/subscriptions`)
                .send({
                    type: "ASSET",
                    descriptor: "/assets/test_1_1_0.level"
                })
                .expect('Content-Type', 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    res.error.should.equal(false);
                    res.body.should.be.an.Object;
                    res.body.type.should.equal('ASSET');
                    done();
                });
        });

        it('Retrieve status of specific Asset from Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/status/assets/test_1_1_0.level`)
                .expect('Content-Type', 'application/json')
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
