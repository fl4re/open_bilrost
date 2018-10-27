/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const start_bilrost_client = require('../util/local_bilrost_client');
const fixture = require('../util/fixture')('integration_stage');
const bilrost = require('../util/server')(fixture);
const workspace = require('../util/workspace')('ken', fixture);

let client;

describe('Run Version Control related functional tests for the API', function() {
    before("Starting a Content Browser server", async () => {
        const bilrost_client = await start_bilrost_client();
        bilrost_client.set_session_id("1234");
        bilrost_client.get = (url, callback) => callback(false, null, null, workspace.get_name());
        client = await bilrost.start({
            bilrost_client,
            protocol: 'ssh',
            config_path: fixture.get_config_path()
        });
    });

    before("Creating fixtures", async function () {
        this.timeout(4000);
        await workspace.create('good_repo');
        workspace.create_workspace_resource();
        workspace.create_project_resource();
    });

    after("Removing fixtures", () => workspace.remove());

    describe("Test Bilrost Version Control operations", function() {

        it('Add Asset Subscription to Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/subscriptions`)
                .send({
                    type: "ASSET",
                    descriptor: "/assets/test_1_1_0.level"
                })
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

        it('Reset workspace Stage list', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .del(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/stage`)
                .send()
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.text.should.equal('Ok');
                    done();
                });
        });

        it('Add Removed Asset to Workspace Stage', function(done) {
            workspace.remove_asset('/assets/test_1_1_0.level');
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/stage/assets/test_1_1_0.level`)
                .send()
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    res.text.should.equal('Ok');
                    done();
                });
        });

        it('Succeed to add non subscribed Asset to Workspace Stage', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/stage/assets/levels/test_001.level`)
                .send()
                .expect(200)
                .end((err, res) => {
                    should.exist(err);
                    res.body.should.equal('"Stage manager" encoutered an unexpected failure: Asset ref is not under any Subscription.');
                    done();
                });
        });

        it('Fail to add non existent Asset to Workspace Stage', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/stage/invalid/path`)
                .send()
                .expect(200)
                .end((err, res) => {
                    should.exist(err);
                    res.body.code.should.equal('ResourceNotFound');
                    done();
                });
        });

        it('Get Workspace Stage with most recent entry', function(done) {
            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/stage`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    res.body.should.be.an.Object;
                    res.body.items[0].should.equal('/assets/test_1_1_0.level');
                    done();
                });
        });

        it('Get Workspace Stage with most recent entry', function(done) {
            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/stage`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    res.body.should.be.an.Object;
                    res.body.items[0].should.equal('/assets/test_1_1_0.level');
                    done();
                });
        });

        it('Delete Asset from Workspace Stage', function(done) {
            client
                .delete(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/stage/assets/test_1_1_0.level`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.should.be.a.String;
                    res.text.should.equal('Ok');
                    done();
                });
        });

    });

});
