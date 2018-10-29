/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const start_bilrost_client = require('../util/local_bilrost_client');
const fixture = require('../util/fixture')('integration_subscription');
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

        let new_subscription_id;

        it('Add Namespace Subscription to Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/subscriptions`)
                .send({
                    type: "NAMESPACE",
                    descriptor: "/assets/prefab/"
                })
                .expect('Content-Type', 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.error.should.equal(false);
                    done();
                });
        });

        it('Add Search Subscription to Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/subscriptions`)
                .send({
                    type: "SEARCH",
                    descriptor: "test created:> 2004 type: prefab"
                })
                .expect('Content-Type', 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.error.should.equal(false);

                    res.body.should.be.an.Object;
                    res.body.type.should.equal('SEARCH');

                    done();
                });
        });

        it('Reset subscription list', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            client
                .del(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/subscriptions`)
                .send()
                .expect('Content-Type', 'text/plain')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    const subscription_list = workspace.read_workspace_resource().subscriptions;
                    should.equal(subscription_list.length, 0);
                    should.equal(res.text, 'Ok');
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
                    new_subscription_id = res.body.id;
                    done();
                });
        });

        it('Fail to add invalid Namespace Subscription to Workspace', function(done) {
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/subscriptions`)
                .send({
                    type: "NAMESPACE",
                    descriptor: "/invalid"
                })
                .expect('Content-Type', 'application/json')
                .expect(500)
                .end((err, res) => {
                    should.exist(res.error);
                    done();
                });
        });

        it('Get Subscription List with most recent entry', function(done) {
            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/subscriptions`)
                .expect(200)
                .expect('Content-Type', 'application/json')
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.should.be.an.Object;
                    should.exist(res.body.subscriptions);
                    should.exist(res.body.subscriptions[0]);
                    res.body.subscriptions[0].id.should.equal(new_subscription_id);
                    done();
                });
        });

    });

});
