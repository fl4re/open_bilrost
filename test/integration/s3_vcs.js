/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const Test_util = require('../util/test_util');
const start_bilrost_client = require('../util/local_bilrost_client');
const bilrost = require('../util/server');

let client, test_util, workspace_name;

describe('Run Version Control related functional tests for the API', function() {
    /* faking bilrost-client
       we define a bilrost_client that simply calls the callback with
       the predefined parameters.
       These parameters are only declared here, and they are set in
       a before clause according to what we want to test.
     */
    let err, req, res, obj;

    before("Starting a Content Browser server", async () => {
        const bilrost_client = await start_bilrost_client();
        bilrost_client.set_session_id("1234");
        bilrost_client.get = (url, callback) => callback(err, req, res, obj);
        client = await bilrost.start({
            bilrost_client,
            protocol: 'ssh'
        });
        test_util = new Test_util("vcs", "production_repo", client);
    });

    describe("Test Bilrost Version Control operations", function() {
        before('Set bilrost_client answer', function() {
            err = false;
            req = null;
            res = null;
            obj = test_util.get_example_project();
            workspace_name = test_util.get_example_project().name;
        });

        let new_subscription_id;
        let new_subscription_url;
        it('Create a Workspace by cloning repository', function(done) {
            this.timeout(8*this.timeout());
            test_util.client
                .post('/assetmanager/workspaces')
                .send({
                    file_uri: test_util.get_ken_file_uri(),
                    name: workspace_name,
                    description: test_util.get_example_project().description.comment,
                    organization: test_util.get_example_project().owner.login,
                    project_name: workspace_name,
                    branch: 'production_repo'
                })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect("Content-Type", "application/vnd.bilrost.workspace+json")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = test_util.get_favorite().search(test_util.get_ken_file_uri());

                    obj.should.be.an.Object;
                    done();
                });
        });

        it('Add Asset Subscription to Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .post(`/assetmanager/workspaces/${workspace_name}/subscriptions`)
                .send({
                    type: "ASSET",
                    descriptor: "/assets/test_1_1_0.level"
                })
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    res.error.should.equal(false);
                    res.body.should.be.an.Object;
                    res.body.type.should.equal('ASSET');
                    new_subscription_id = res.body.id;
                    new_subscription_url = res.body.url;
                    done();
                });
        });

        it('Add Namespace Subscription to Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .post(`/assetmanager/workspaces/${workspace_name}/subscriptions`)
                .send({
                    type: "NAMESPACE",
                    descriptor: "/assets/prefab/"
                })
                .set("Accept", 'application/json')
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
            test_util.client
                .post(`/assetmanager/workspaces/${workspace_name}/subscriptions`)
                .send({
                    type: "SEARCH",
                    descriptor: "test created:> 2004 type: prefab"
                })
                .set("Accept", 'application/json')
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

        it('Fail to add invalid Namespace Subscription to Workspace', function(done) {
            test_util.client
                .post(`/assetmanager/workspaces/${workspace_name}/subscriptions`)
                .send({
                    type: "NAMESPACE",
                    descriptor: "/invalid"
                })
                .set("Accept", 'application/json')
                .expect(500)
                .end((err, res) => {
                    should.exist(res.error);
                    done();
                });
        });

        it('Get Subscription List with most recent entry', function(done) {
            test_util.client
                .get(`/assetmanager/workspaces/${workspace_name}/subscriptions`)
                .set("Accept", 'application/json')
                .expect(200)
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

        it('Add Removed Asset to Workspace Stage', function(done) {
            test_util.remove_asset_file('/assets/test_1_1_0.level');
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .post(`/assetmanager/workspaces/${workspace_name}/stage/assets/test_1_1_0.level`)
                .send()
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    res.body.should.equal('Ok');
                    res.body.should.be.an.Object;
                    done();
                });
        });

        it('Succeed to add non subscribed Asset to Workspace Stage', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .post(`/assetmanager/workspaces/${workspace_name}/stage/assets/levels/test_001.level`)
                .send()
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    should.exist(err);
                    res.body.should.equal('"Stage manager" encoutered an unexpected failure: Asset ref is not under any Subscription.');
                    done();
                });
        });

        it('Fail to add non existent Asset to Workspace Stage', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .post(`/assetmanager/workspaces/${workspace_name}/stage/invalid/path`)
                .send()
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    should.exist(err);
                    res.body.code.should.equal('ResourceNotFound');
                    done();
                });
        });

        it('Get Workspace Stage with most recent entry', function(done) {
            test_util.client
                .get(`/assetmanager/workspaces/${workspace_name}/stage`)
                .set("Accept", 'application/json')
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
            test_util.client
                .delete(`/assetmanager/workspaces/${workspace_name}/stage/assets/test_1_1_0.level`)
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.should.be.a.String;
                    res.body.should.equal('Ok');
                    done();
                });
        });

        it('Delete Asset Subscription from Workspace', function(done) {
            test_util.client
                .delete(new_subscription_url)
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.should.be.a.String;
                    res.body.should.equal('Ok');
                    done();
                });
        });

        it('Get commit log from Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            test_util.client
                .get(`/assetmanager/workspaces/${workspace_name}/commits?maxResults=3`)
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.items.should.be.an.Array;
                    res.body.items.length.should.be.above(0);
                    res.body.items[0].id.should.be.a.String;
                    res.body.items[0].message.should.be.a.String;
                    res.body.items[0].changed_paths.should.be.an.Array;
                    done();
                });
        });

        it('Get commit log for specific Asset', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            test_util.client
                .get(`/assetmanager/workspaces/${workspace_name}/commits/assets/test_1_1_0.level`)
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.items.should.be.an.Array;
                    res.body.items[0].id.should.be.a.String;
                    res.body.items[0].message.should.be.a.String;
                    res.body.items[0].changed_paths.should.be.an.Array;
                    done();
                });
        });

        it('Get commit log with pagination', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            test_util.client
                .get(`/assetmanager/workspaces/${workspace_name}/commits?start_at_revision=r238&maxResults=2`)
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.items.should.be.an.Array;
                    res.body.items.length.should.be.above(0);
                    res.body.items[0].id.should.be.a.String;
                    res.body.items[0].message.should.be.a.String;
                    res.body.items[0].changed_paths.should.be.an.Array;
                    done();
                });
        });


        it('Hard delete the initialized Workspace', function(done){
            test_util.client
                .delete(`/assetmanager/workspaces/${workspace_name}`)
                .send({ hard_delete: true })
                .set("Accept", 'application/json')
                .set("Content-Type", "application/json")
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.not.exist(err);
                    test_util.get_favorite().search(test_util.get_ken_file_uri()).should.equal(false);
                    done();
                });

        });

    });

});
