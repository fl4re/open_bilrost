/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const start_bilrost_client = require('../util/local_bilrost_client');
const fixture = require('../util/fixture')('integration_vcs');
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

        it('Get commit log from Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/commits?maxResults=3`)
                .expect(200)
                .expect('Content-Type', 'application/json')
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

            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/commits/assets/test_1_1_0.level`)
                .expect('Content-Type', 'application/json')
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

            client
                .get(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/commits?start_at_revision=HEAD&maxResults=2`)
                .expect('Content-Type', 'application/json')
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
            client
                .delete(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}`)
                .send({ hard_delete: true })
                .expect('Content-Type', 'text/plain')
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.not.exist(err);
                    done();
                });

        });

    });

});
