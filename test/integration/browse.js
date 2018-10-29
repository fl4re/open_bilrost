/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const workspace_factory = require('../util/workspace');
const fixture = require('../util/fixture')('integration_browse');
const favorite = require('../../lib/favorite')(fixture.get_config_path());

const bilrost = require('../util/server')(fixture);

let client, workspaces, bob_test_asset;

describe('Run Content Browser related test for content browser api', function () {

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start({ config_path: fixture.get_config_path() });
    });
    before("Creating fixtures", async function () {
        this.timeout(5000);
        workspaces = {
            eloise: workspace_factory('eloise', fixture),
            alice: workspace_factory('alice', fixture),
            bob: workspace_factory('bob', fixture),
            luke: workspace_factory('luke', fixture)
        };
        const workspace_creation_sequence = Object.keys(workspaces)
            .map(async workspace_name => {
                const workspace = workspaces[workspace_name];
                await workspace.create('good_repo');
                workspace.create_workspace_resource();
                workspace.create_project_resource();
            });
        await Promise.all(workspace_creation_sequence);
        await favorite.add({
            name: workspaces.alice.get_name(),
            file_uri: workspaces.alice.get_file_uri()
        });
        bob_test_asset = workspaces.bob.create_asset({
            meta: {
                ref: '/assets/test.level'
            }
        });
    });

    after("Removing fixtures", () => Promise.all(Object.keys(workspaces).map(workspace_name => workspaces[workspace_name].remove())));

    describe('-- [GET] /contentbrowser/projects/', function(){
        it("", function(done) {

            client
                .get('/contentbrowser/projects/')
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });
    });

    describe('-- [GET] /contentbrowser/projects/:org', function(){
        it("", function(done) {

            client
                .get('/contentbrowser/projects/fl4re')
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });
    });

    describe('-- [GET] /contentbrowser/projects/:project_full_name', function(){
        it("", function(done) {

            client
                .get('/contentbrowser/projects/fl4re/open_bilrost_test_project')
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });
        });
    });

    describe('-- [GET] /contentbrowser/projects/:project_full_name/', function(){
        it("", function(done) {

            client
                .get('/contentbrowser/projects/fl4re/open_bilrost_test_project')
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });
    });

    describe('-- [GET] /contentbrowser/projects/:project_full_name/:branch_name/assets/', function(){
        it("Check we can't list project assets without authorization", function(done) {

            client
                .get('/contentbrowser/projects/fl4re/open_bilrost_test_project/assets/')
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });


        });
    });

    describe('-- [GET] /contentbrowser/projects/:project_full_name/:branch_name/:assets_ref', function(){
        it("Check we can't list project assets without authorization", function(done) {

            client
                .get('/contentbrowser/projects/fl4re/open_bilrost_test_project/assets/test.level')
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });
    });

    describe('-- [GET] /contentbrowser/workspaces/', function() {

        before("Add bob workspace", function(done) {

            client.post('/assetmanager/favorites')
                .send({ file_uri: workspaces.bob.get_file_uri(), name: workspaces.bob.get_name() })
                .expect('Content-Type', 'application/vnd.bilrost.workspace+json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    favorite.find(workspaces.bob.get_name())
                        .then(obj => {
                            obj.should.be.an.instanceOf(Object);
                            done();
                        })
                        .catch(done);
                });

        });


        after("Remove luke workspace settings", async () => {
            await favorite.remove(workspaces.luke.get_name());
            await favorite.remove(workspaces.alice.get_name());
        });

        it("Retrieve bob and eloise workspaces only", function(done){

            client
                .get('/contentbrowser/workspaces/')
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(1);
                    obj.totalItems.should.be.above(1);
                    done();
                });

        });

        it("Can't retrieve luke workspace by name since not referenced in favorite list", function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.luke.get_name()}`)
                .expect("Content-Type", "application/json")
                .expect(404)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    done();
                });

        });

        it("Retrieve luke workspace without being referenced in favorite list using file uri identifier", function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.luke.get_encoded_file_uri()}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.equal(1);
                    obj.totalItems.should.be.equal(1);
                    obj.items[0].file_uri.should.be.equal(workspaces.luke.get_file_uri());
                    done();
                });

        });

        it("Can't retrieve luke workspace with its associated invalid statuses", function(done){
            favorite.add({
                name: workspaces.luke.get_name(),
                file_uri: workspaces.luke.get_file_uri()
            })
                .then(() => workspaces.luke.create_workspace_resource([
                    {
                        context: "asset_validator",
                        state: "INVALID",
                        description: "The validation failed!",
                        info: {}
                    },
                    {
                        context: "workspace_validator",
                        state: "DELETED",
                        description: "The validation is missing!",
                        info: {}
                    }
                ]))
                .then(() => {
                    client
                        .get(`/contentbrowser/workspaces/${workspaces.luke.get_name()}`)
                        .expect(403)
                        .end((err, res) => {
                            if (err) {
                                return done({ error: err.toString(), status: res.status, body: res.body });
                            }
                            done();
                        });
                });
        });

        it("Retrieve alice and eloise workspaces only without luke", function(done){

            client
                .get('/contentbrowser/workspaces/')
                .expect("Content-Type", "application/json")
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(1);
                    obj.totalItems.should.be.above(1);
                    done();
                });

        });

        it("Retrieve luke workspace after changing its associated statuses to valid", function(done){

            favorite.update(workspaces.luke.get_name(), {
                name: workspaces.luke.get_name(),
                url: workspaces.luke.get_file_uri()
            })
                .then(() => workspaces.luke.create_workspace_resource([
                    {
                        context: "asset_validator",
                        state: "VALID",
                        description: "The validation succeeded!",
                        info: {}
                    },
                    {
                        context: "workspace_validator",
                        state: "VALID",
                        description: "The validation succeeded!",
                        info: {}
                    }
                ]))
                .then(() => {
                    client
                        .get(`/contentbrowser/workspaces/${workspaces.luke.get_name()}`)
                        .expect("Content-Type", "application/json")
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                return done({ error: err.toString(), status: res.status, body: res.body });
                            }
                            done();
                        });

                });

        });

        it("Retrieve alice, eloise and luke", function(done){

            client
                .get('/contentbrowser/workspaces/')
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(2);
                    obj.totalItems.should.above(2);
                    done();
                });

        });

        it('Check "paging" query paramaters for retrieving workspaces', function(done){

            client
                .get('/contentbrowser/workspaces/?maxResults=1')
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    obj.items.length.should.be.above(0);
                    obj.totalItems.should.be.above(1);
                    client
                        .get(obj.nextLink)
                        .expect("Content-Type", "application/json")
                        .expect(200)
                        .end((err, res) => {
                            const obj = res.body;
                            if (err) {
                                return done({ error: err.toString(), status: res.status, body: obj });
                            }
                            obj.items.length.should.be.above(0);
                            obj.totalItems.should.be.above(1);
                            done();
                        });
                });

        });

        it('Check "filter" query paramaters for retrieving workspaces', function(done){

            client
                .get(`/contentbrowser/workspaces/?name=${workspaces.bob.get_name()}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(1);
                    obj.totalItems.should.equal(1);
                    done();
                });
        });

        it("Can't retrieve luke workspace since it has been removed from favorite list", function(done){

            favorite.remove(workspaces.luke.get_name())
                .then(function() {
                    client
                        .get(`/contentbrowser/workspaces/${workspaces.luke.get_name()}`)
                        .expect(404)
                        .end((err, res) => {
                            if (err) {
                                return done({ error: err.toString(), status: res.status, body: res.body });
                            }
                            done();
                        });
                });
        });

    });

    describe('-- [GET] /contentbrowser/workspaces/{workspace_name}/assets/', function() {

        it('Retrieve test asset', function(done){
            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}${bob_test_asset.meta.ref}`)
                .expect("Content-Type", "application/vnd.bilrost.level+json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.should.containDeep(bob_test_asset);
                    done();
                });

        });

        it("Don't retrieve unknown asset", function(done) {

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/unknown`)
                .expect("Content-Type", "application/json")
                .expect(404)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it("Retrieve assets in prefab namespace", function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/prefab/`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(1);
                    obj.totalItems.should.equal(2);
                    done();
                });

        });

        it('Check "paging" query paramaters for retrieving assets in prefab namespace', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/prefab/?maxResults=1`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(1);
                    obj.totalItems.should.equal(2);
                    client
                        .get(obj.nextLink)
                        .set("Content-Type", "application/json")
                        .expect("Content-Type", "application/json")
                        .expect(200)
                        .end((err, res) => {
                            const obj = res.body;
                            if (err) {
                                return done({ error: err.toString(), status: res.status, body: obj });
                            }
                            obj.items.should.have.lengthOf(1);
                            obj.totalItems.should.equal(2);
                            done();
                        });
                });

        });

        it('Check "filter" query paramaters for retrieving assets in prefab namespace', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/prefab/?ref=*`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(1);
                    obj.totalItems.should.equal(2);
                    done();
                });

        });

        it('Search one asset', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=mall`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(1);
                    obj.totalItems.should.equal(1);
                    done();
                });

        });

        it('Search all levels', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent(".level")}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(1);
                    obj.totalItems.should.be.above(1);
                    done();
                });

        });

        it('Search all levels OR test prefab', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent(".level OR test tag: TEST")}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(2);
                    obj.totalItems.should.be.above(2);
                    done();
                });

        });

        it('Search all levels OR test prefab', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent("type: level AND NOT (1_1_0 OR tag: TEST)")}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    should.exist(obj.items);
                    done();
                });

        });

        it('Search all assets created between 2000 and 2020', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent('created:.. 2000 2040 AND comment: "test asset!"')}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(1);
                    obj.totalItems.should.equal(1);
                    done();
                });

        });

        it('Search for asset with specific dependency', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent('dependency: /resources/test/test')}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(1);
                    obj.totalItems.should.equal(1);
                    done();
                });

        });

        it('Find 0 results searching for asset with invalid dependency', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent('dependency: /resources/test/test.invalid')}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(0);
                    obj.totalItems.should.equal(0);
                    done();
                });

        });

        it('Search for asset with specific tag', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent('tag: TEST')}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(1);
                    obj.totalItems.should.equal(1);
                    done();
                });

        });

        it('Find 0 results searching for asset with invalid tag', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/assets/?q=${encodeURIComponent('tag: TESTWRONG')}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(0);
                    obj.totalItems.should.equal(0);
                    done();
                });

        });

    });

    describe('-- [GET] /contentbrowser/workspaces/{workspace_name}/resources/', function(){

        after("Remove eloise workspace", function(done) {

            client
                .delete(`/assetmanager/workspaces/${workspaces.bob.get_encoded_file_uri()}`)
                .expect(200)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    const obj = await favorite.find(workspaces.bob.get_file_uri());
                    should.equal(obj, undefined);
                    done();
                });

        });


        it('Retrieve mall resource from eloise workspace using name identifier', function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/resources/mall/mall_demo`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    const mall_ref = '/resources/mall/mall_demo';
                    obj.path.toUpperCase().should.equal(workspaces.bob.get_resource_path(mall_ref).toUpperCase());
                    obj.ref.should.equal(mall_ref);
                    done();
                });

        });

        it("Don't retrieve unknown resource", function(done) {

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/resources/unknown`)
                .expect("Content-Type", "application/json")
                .expect(404)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });


        it("Don't retrieve unknown resource", function(done) {

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/resources/assets`)
                .expect("Content-Type", "application/json")
                .expect(404)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it("Retrieve resources in root folder", function(done){


            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/resources/`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(4);
                    obj.totalItems.should.equal(4);
                    obj.items.map(item => item.should.have.properties("ref", "path"));
                    done();
                });

        });

        it('Check "paging" query paramaters for retrieving resources in root folder', function(done) {

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/resources/?maxResults=1`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.should.have.lengthOf(1);
                    obj.items.map(item => item.should.have.properties("ref", "path"));
                    obj.totalItems.should.equal(4);
                    client
                        .get(obj.nextLink)
                        .set("Content-Type", "application/json")
                        .expect("Content-Type", "application/json")
                        .expect(200)
                        .end((err, res) => {
                            const obj = res.body;
                            if (err) {
                                return done({ error: err.toString(), status: res.status, body: obj });
                            }
                            obj.items.should.have.lengthOf(1);
                            obj.items.map(item => item.should.have.properties("ref", "path"));
                            obj.totalItems.should.equal(4);
                            done();
                        });
                });
        });

        it("Retrieve resources in root folder with search query", function(done){

            client
                .get(`/contentbrowser/workspaces/${workspaces.bob.get_encoded_file_uri()}/resources/?q=${encodeURIComponent("test OR mall")}`)
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    const obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    obj.items.length.should.be.above(16);
                    obj.items.map(item => item.should.have.properties("ref", "path"));
                    obj.totalItems.should.be.above(16);
                    done();
                });

        });

    });

});
