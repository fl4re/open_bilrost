/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Print stack trace for debugging
global.debug = true;

const should = require('should');
const fs = require('fs-extra');
const bilrost = require('../util/server');
const fixture = require('../util/fixture')('integration_workspace');
const workspace_factory = require('../util/workspace');
const favorite = require('../../lib/favorite')(fixture.get_config_path());

let client, workspaces;

describe('Run Workspace related functional tests for the API', function() {
    /* faking bilrost-client
       we define a bilrost_client that simply calls the callback with
       the predefined parameters.
       These parameters are only declared here, and they are set in
       a before clause according to what we want to test.
     */
    const bilrost_client = {
        get: (url, callback) => callback(undefined, null, null, workspaces.carol.get_github_project())
    };

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start({
            bilrost_client,
            protocol: 'ssh',
            config_path: fixture.get_config_path()
        });
    });

    before("Creating fixtures", async function () {
        this.timeout(5000);
        workspaces = {
            carol: workspace_factory('carol', fixture),
            alice: workspace_factory('alice', fixture),
            bob: workspace_factory('bob', fixture),
            luke: workspace_factory('luke', fixture)
        };
        const workspace_creation_sequence = Object.keys(workspaces)
            .map(async workspace_name => {
                const workspace = workspaces[workspace_name];
                await workspace.create(workspace_name === 'luke' ? 'bad_repo' : 'good_repo');
                workspace.create_workspace_resource();
                workspace.create_project_resource();
            });
        await Promise.all(workspace_creation_sequence);
    });
    after("Removing fixtures", () => Promise.all(Object.keys(workspaces).map(workspace_name => workspaces[workspace_name].remove())));

    describe('Add Workspaces to favorites', function () {
        it('Add "example1" Workspace to favorites', function (done) {

            client
                .post('/assetmanager/workspaces/favorites')
                .send({ file_uri: workspaces.alice.get_file_uri() })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    (await favorite.find(workspaces.alice.get_file_uri())).should.be.an.Object;
                    done();
                });

        });

        it('Add "example2" Workspace to favorites', function(done){

            client
                .post('/assetmanager/workspaces/favorites')
                .send({file_uri: workspaces.bob.get_file_uri()})
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    (await favorite.find(workspaces.bob.get_file_uri())).should.be.an.Object;
                    done();
                });

        });

        it("Fail to add an already existing Workspace to favorites", function(done){
            client
                .post('/assetmanager/workspaces/favorites')
                .send({ file_uri: workspaces.alice.get_file_uri() })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(403)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    (await favorite.find(workspaces.alice.get_file_uri())).should.be.an.Object;
                    done();
                });

        });

        it("Fail to add invalid Workspace to favorites", function(done){

            client
                .post('/assetmanager/workspaces/favorites')
                .send({ file_uri: workspaces.luke.get_file_uri() })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });
    });

    describe("Remove Workspaces from favorites", function() {

        it('Remove "example1" Workspace from favorites', function(done){

            client
                .delete(`/assetmanager/workspaces/${workspaces.alice.get_name()}/favorites`)
                .set("Accept", 'application/json')
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.equal(await favorite.find(workspaces.alice.get_file_uri()), undefined);
                    done();
                });

        });

        it('Remove "example2" Workspace from favorites', function(done){
            client
                .delete(`/assetmanager/workspaces/${workspaces.bob.get_name()}/favorites`)
                .set("Accept", 'application/json')
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.equal(await favorite.find(workspaces.bob.get_file_uri()), undefined);
                    done();
                });

        });

        it('Check workspace removal is idempotent', function(done){
            client
                .delete(`/assetmanager/workspaces/${workspaces.bob.get_name()}/favorites`)
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

    describe("Create workspaces", function() {

        it('Delete a workspace', function(done){
            client
                .delete(`/assetmanager/workspaces/${encodeURIComponent(workspaces.carol.get_file_uri())}`)
                .send()
                .set("Accept", 'application/json')
                .set("Content-Type", "application/json")
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.equal(await favorite.find(workspaces.carol.get_file_uri()), undefined);
                    should.equal(workspaces.carol.validate_workspace_root_directories(), false);
                    done();
                });

        });

        it('Create a workspace', function (done) {
            this.timeout(8*this.timeout());
            client
                .post('/assetmanager/workspaces')
                .send({
                    file_uri: workspaces.carol.get_file_uri(),
                    from_repo: true,
                    name: workspaces.carol.get_github_project().name,
                    description: workspaces.carol.get_github_project().description.comment,
                    organization: workspaces.carol.get_github_project().owner.login,
                    project_name: workspaces.carol.get_github_project().name,
                    branch: 'good_repo',
                })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = await favorite.find(workspaces.carol.get_file_uri());

                    obj.should.be.an.Object;
                    should.equal(workspaces.carol.validate_workspace_root_directories(), true);
                    done();
                });
        });

        it('Reset a workspace', function (done) {
            this.timeout(8*this.timeout());
            workspaces.carol.create_resource('test', 'Hello world!');
            workspaces.carol.create_resource('foo/bar', 'Hello world!');
            client
                .post(`/assetmanager/workspaces/${encodeURIComponent(workspaces.carol.get_file_uri())}/reset`)
                .send()
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.equal(fs.readdirSync(workspaces.carol.get_path()).length, 3);
                    done();
                });
        });


        it('Forget the copied Workspace from favorite list', function(done){
            client
                .delete(`/assetmanager/workspaces/${workspaces.carol.get_encoded_file_uri()}/favorites`)
                .send()
                .set("Accept", 'application/json')
                .set("Content-Type", "application/json")
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.equal(await favorite.find(workspaces.carol.get_encoded_file_uri()), undefined);
                    done();
                });

        });

        it('Dont create a workspace when the target location already exists', function (done) {
            this.timeout(8*this.timeout());
            client
                .post('/assetmanager/workspaces')
                .send({
                    file_uri: workspaces.carol.get_file_uri(),
                    from_repo: true,
                    name: workspaces.carol.get_github_project().name,
                    description: workspaces.carol.get_github_project().description.comment,
                    organization: workspaces.carol.get_github_project().owner.login,
                    project_name: workspaces.carol.get_github_project().name,
                    branch: 'good_repo',
                })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(403)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    if (~res.body.indexOf('already exist')) {
                        done();
                    } else {
                        done('This error is not the one expected!');
                    }
                });
        });

    });
});
