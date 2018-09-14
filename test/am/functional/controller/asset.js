/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const path = require('path');
const fs = require('fs-extra');
const Test_util = require('../../../util/test_util');
const bilrost = require('../../../util/bilrost');

let client, test_util;

describe('Run Asset related functional tests for the API', function() {

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start();
        test_util = new Test_util("asset", "good_repo", client);
    });
    before("Creating fixtures", function(done) {
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        test_util.create_eloise_fixtures()
            .then(() => test_util.create_eloise_workspace_project_file())
            .then(() => test_util.create_eloise_workspace_properties_file())
            .then(() => test_util.add_eloise_to_favorite())
            .then(() => done())
            .catch(done);
    });
    after("Removing fixtures", done => {
        this.timeout(3*this.timeout()); // = 3 * default = 3 * 2000 = 6000
        test_util.remove_fixtures(done);
    });

    describe('Creating assets!', function() {

        it('Create an asset', function(done){
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test"],
                semantics: []
            };
            const asset_ref = '/assets/levels/test_002.level';
            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = test_util.read_asset_file(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    test_util.remove_asset_file(asset_ref);
                    test_util.get_database().remove(asset_ref).then(function() {
                        done();
                    }).catch(done);
                });
        });

        it('Create an asset that has the same name as a namespace', function(done){
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            const asset_ref = '/assets/levels';
            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send()
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    test_util.remove_asset_file(asset_ref);
                    test_util.get_database().remove(asset_ref).then(function() {
                        done();
                    }).catch(done);
                });
        });

        it('Create an asset with a random extension', function(done){
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            const random_extension = Math.random().toString(36).substring(10);

            const asset = {
                main: "/resources/test/test04",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: [],
                semantics: []
            };
            const asset_ref = '/assets/levels/random_ext_asset.' + random_extension;
            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Accept", 'application/json')
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = test_util.read_asset_file(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    test_util.remove_asset_file(asset_ref);
                    test_util.get_database().remove(asset_ref).then(function() {
                        done();
                    }).catch(done);
                });
        });

        it('Create an asset without main dependency', function(done){
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            const asset = {
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test"],
                semantics: [],
                main: ""
            };
            const asset_ref = '/assets/levels/test_003.level';
            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = test_util.read_asset_file(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    test_util.remove_asset_file(asset_ref);
                    test_util.get_database().remove(asset_ref).then(function() {
                        done();
                    }).catch(done);
                });
        });


        it('Create an empty asset', function(done){
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

            const asset = {
                main: "",
                comment: "",
                dependencies: [],
                tags: []
            };
            const asset_ref = '/assets/levels/test_006.level';
            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = test_util.read_asset_file(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    test_util.remove_asset_file(asset_ref);
                    test_util.get_database().remove(asset_ref).then(function() {
                        done();
                    }).catch(done);
                });
        });

        it('Cannot create an asset with an invalid asset', function(done){
            const asset = {
                main: "/resources/test/a/test_005",
                comment: ["This shouldn't be an array"],
                tags: "this shouldn't be a string",
                dependencies: "this shouldn't be a string",
                semantics: "this shouldn't be a string"
            };

            const asset_ref = "/assets/levels/test_011.level";
            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });
        });

        it('Cannot create an asset with invalid asset path', function(done){
            const asset = {
                main: "/resources/test/b/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };

            const asset_ref = "/assets/levels/test_011.level";
            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });


        it('Cannot create an asset with invalid content type header', function(done){
            const asset = {
                main: "/resources/test/b/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };

            const asset_ref = "/assets/levels/test_011.level";

            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });
        });


    });

    describe('Renaming assets!', function() {

        const test_002 = {
            "meta":{
                "ref": "/assets/levels/test_002.level",
                "type": "application/json",
                "created": "2016-03-16T14:41:10.384Z",
                "modified": "2016-03-18T10:54:05.870Z",
                "version":"1.1.0",
                "author": ""
            },
            "comment": "",
            "tags": [],
            "main": "/resources/prefab/test",
            "dependencies": [
                "/assets/levels/test_001.level"
            ],
            "semantics": []
        };
        const test_003 = {
            "meta":{
                "ref": "/assets/levels/test/003/test_003.level",
                "type": "application/json",
                "created": "2016-03-16T14:41:10.384Z",
                "modified": "2016-03-18T10:54:05.870Z",
                "version":"1.1.0",
                "author": ""
            },
            "comment": "",
            "tags": [],
            "main": "/resources/test/a/test_005",
            "dependencies": [
                "/assets/levels/test_001.level",
                "/assets/levels/test_005.level"
            ],
            "semantics": []
        };
        const test_005 = {
            "meta":{
                "ref": "/assets/levels/test_005.level",
                "type": "application/json",
                "created": "2016-03-16T14:41:10.384Z",
                "modified": "2016-03-18T10:54:05.870Z",
                "version":"1.1.0",
                "author": ""
            },
            "comment": "",
            "tags": [],
            "main": "/resources/mall/mall_demo",
            "dependencies": [],
            "semantics": []
        };

        before("create referenced assets", function(done) {
            // test level
            test_util.write_asset_file(test_002.meta.ref, test_002);
            test_util.write_asset_file(test_003.meta.ref, test_003);
            test_util.write_asset_file(test_005.meta.ref, test_005);
            Promise.all([
                test_util.get_database().add(test_002),
                test_util.get_database().add(test_003),
                test_util.get_database().add(test_005)
            ]).then(function(){
                done();
            }).catch(done);
        });

        it('Rename an asset', function(done) {
            let asset = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/test_001",
                "dependencies": [
                    "/resources/mall/mall_demo"
                ],
                "semantics": []
            };
            const asset_ref = '/assets/levels/test_001.level';
            const asset_path = path.join(test_util.get_eloise_path(), '.bilrost', asset_ref);

            const new_asset_ref = '/assets/levels/test/004/test_004.level';
            client
                .post(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), 'rename', test_util.get_test_level().meta.ref))
                .send({ new: new_asset_ref})
                .set("Content-Type", "application/vnd.bilrost.asset+json")
                .set("Accept", "application/json")
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.exist(obj);
                    should.equal(new_asset_ref, obj.ref);
                    let renamed_asset = test_util.read_asset_file(new_asset_ref);
                    should.equal(renamed_asset.meta.ref, new_asset_ref);
                    delete renamed_asset.meta;
                    should.deepEqual(renamed_asset, asset);

                    let test002_asset = test_util.read_asset_file(test_002.meta.ref);
                    should.equal(test002_asset.dependencies.indexOf(asset_ref),-1);
                    should.equal(test002_asset.dependencies.indexOf(new_asset_ref),0);

                    let test003_asset = test_util.read_asset_file(test_003.meta.ref);
                    should.equal(test003_asset.dependencies.indexOf(asset_ref),-1);
                    should.equal(test003_asset.dependencies.indexOf(new_asset_ref),0);

                    fs.readJson(asset_path, function(json){
                        should.equal(json.code, 'ENOENT');
                        done();
                    });
                });
        });

        after("remove referenced assets", function(done) {
            // test level
            const test04_ref = '/assets/levels/test/004/test_004.level';
            test_util.remove_asset_file(test_002.meta.ref);
            test_util.remove_asset_file(test_003.meta.ref);
            test_util.remove_asset_file(test04_ref);
            test_util.write_asset_file('/assets/levels/test_001.level', test_util.get_test_level());
            Promise.all([
                test_util.get_database().remove(test_002.meta.ref),
                test_util.get_database().remove(test_003.meta.ref),
                test_util.get_database().remove(test04_ref),
                test_util.get_database().add(test_util.get_test_level())
            ]).then(function(){
                done();
            }).catch(done);
        });

        it('Cannot rename an unexisted asset', function(done){

            const new_asset_ref = '/assets/levels/test/004/test_004.level';
            client
                .post(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), 'rename', '/assets/unvalid'))
                .send({ new: new_asset_ref})
                .set("Content-Type", "application/vnd.bilrost.asset+json")
                .set("Accept", 'application/json')
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(404)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });
        });

        it('Cannot rename an asset with a none matching modified date', function(done) {

            const new_asset_ref = '/assets/levels/test/004/test_004.level';
            client
                .post(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), 'rename', new_asset_ref))
                .send({ new: new_asset_ref})
                .set("Content-Type", "application/vnd.bilrost.asset+json")
                .set("Accept", 'application/json')
                .set("Last-Modified", "2016-03-18T10:54:05.860Z")
                .expect(412)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot rename an unexisted asset', function(done){

            client
                .post(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), 'rename', test_003.meta.ref))
                .send({ new: '/invalid' })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot rename an asset with invalid content-type header', function(done){

            client
                .post(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), 'rename', test_003.meta.ref))
                .send({ new: '/invalid' })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

    });

    describe('Replacing asset data!', function() {

        it('Replace an asset data', function(done){

            const asset = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": [],
                "semantics": []
            };

            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), test_util.get_test_level().meta.ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let object_returned = res.body;
                    const object_readed = test_util.read_asset_file(test_util.get_test_level().meta.ref);
                    should.deepEqual(object_readed, object_returned);
                    delete object_readed.meta;
                    should.deepEqual(object_readed, asset);
                    done();
                });

        });

        it('Cannot replace an asset data with a none matching modified date', function(done){

            const asset = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": [],
                "semantics": []
            };

            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), test_util.get_test_level().meta.ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", "2016-03-18T10:54:05.860Z")
                .expect(412)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot replace asset data with an invalid asset', function(done){

            const asset = {
                "comment": {},
                "tags": "",
                "main": "/resources/test/a/test_005",
                "dependencies": "",
                "semantics": ""
            };

            const modified = test_util.read_asset_file(test_util.get_test_level().meta.ref).meta.modified;

            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), test_util.get_test_level().meta.ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", modified)
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot replace asset data with invalid paths', function(done) {

            const asset = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": ["/resources/test/b/test_005"],
                "semantics": []
            };

            const modified = test_util.read_asset_file(test_util.get_test_level().meta.ref).meta.modified;

            client
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), test_util.get_test_level().meta.ref))
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", modified)
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

    });

    describe('Deleting assets!', function() {

        it('Delete an asset', function(done){

            const asset_path = path.join(test_util.get_eloise_path(), '.bilrost', test_util.get_test_level().meta.ref);

            client
                .delete(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), test_util.get_test_level().meta.ref))
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(204)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    fs.readJson(asset_path, function(json) {
                        should.equal(json.code, 'ENOENT');
                        test_util.write_asset_file('/assets/levels/test_001.level', test_util.get_test_level());
                        test_util.get_database().add(test_util.get_test_level()).then(function() {
                            done();
                        }).catch(done);
                    });
                });

        });

        it('Delete an asset that defines a removed resource', function(done){

            const ref = "/assets/test_1_1_0.level";
            const asset_path = path.join(test_util.get_eloise_path(), '.bilrost', ref);

            test_util.remove_resource_file("/test/test");
            client
                .delete(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), ref))
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(204)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    fs.readJson(asset_path, function(json) {
                        should.equal(json.code, 'ENOENT');
                        done();
                    });
                });

        });

        it('Cannot delete an asset with an not unexisted ref', function(done){

            client
                .delete(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), 'assets/invalid'))
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", test_util.get_test_level().meta.modified)
                .expect(404)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot delete an asset already referenced by another', function(done){

            const reference_asset = {
                "meta":{
                    "ref": "/assets/levels/reference_asset.level",
                    "type": "application/json",
                    "created": "2016-03-16T14:41:10.384Z",
                    "modified": "2016-03-18T10:54:05.870Z",
                    "version":"1.1.0",
                    "author": ""
                },
                "comment": "",
                "tags": [],
                "main": "/resources/test/foo",
                "dependencies": [
                    test_util.get_test_level().meta.ref
                ],
                "semantics": []
            };
            test_util.write_asset_file('/assets/levels/reference_asset.level', reference_asset);
            test_util.write_eloise_resource_file("test/foo", {});

            test_util.get_database().add(reference_asset).then(() => {

                client
                    .delete(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), test_util.get_test_level().meta.ref))
                    .set("Content-Type", "application/json")
                    .set("Accept", 'application/json')
                    .set("Last-Modified", test_util.get_test_level().meta.modified)
                    .expect(403)
                    .end((err, res) => {
                        if (err) {
                            return done({ error: err.toString(), status: res.status, body: res.body });
                        }
                        done();
                    });

            });

        });

        after("remove referenced assets", function(done) {
            const reference_asset = '/assets/levels/reference_asset.level';
            test_util.remove_asset_file(reference_asset);
            test_util.get_database().remove(reference_asset).then(function() {
                done();
            }).catch(done);
        });

    });
});
