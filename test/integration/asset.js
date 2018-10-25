/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const path = require('path');
const fs = require('fs-extra');
const fixture = require('../util/fixture')('integration_asset');
const server = require('../util/server')(fixture);
const workspace = require('../util/workspace')('eloise', fixture);

let client, database, test_level_asset = {
    meta: {
        ref: '/assets/levels/test_001.level',
    },
    main: '/resources/test/test_001',
    dependencies: [
        '/resources/mall/mall_demo'
    ]
};

describe('Run Asset related functional tests for the API', function() {
    before("Creating fixtures", async () => {
        await workspace.create('good_repo');
        workspace.create_workspace_resource();
        workspace.create_project_resource();
        database = await workspace.instance_database();
    });
    before("Starting a Content Browser server", async () => {
        client = await server.start();
    });
    after("Removing fixtures", () => workspace.remove());

    describe('Creating assets!', function() {

        it('Create an asset', function (done) {
            this.timeout(4000);
            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test"],
                semantics: []
            };
            const asset_ref = '/assets/levels/test_002.level';
            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = workspace.read_asset(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    workspace.remove_asset(asset_ref);
                    try {
                        await database.remove(asset_ref);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });

        it('Create an asset that has the same name as a namespace', done => {
            const asset_ref = '/assets/levels';
            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
                .send()
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    workspace.remove_asset(asset_ref);
                    try {
                        await database.remove(asset_ref);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });


        it('Create an asset with a random extension', done => {
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
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
                .send(asset)
                .set("Accept", 'application/json')
                .expect(201)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = workspace.read_asset(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    workspace.remove_asset(asset_ref);
                    try {
                        await database.remove(asset_ref);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });

        it('Create an asset without main dependency', done => {
            const asset = {
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test"],
                semantics: [],
                main: ""
            };
            const asset_ref = '/assets/levels/test_003.level';
            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = workspace.read_asset(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    workspace.remove_asset(asset_ref);
                    try {
                        await database.remove(asset_ref);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });


        it('Create an empty asset', done => {
            const asset = {
                main: "",
                comment: "",
                dependencies: [],
                tags: []
            };
            const asset_ref = '/assets/levels/test_006.level';
            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = workspace.read_asset(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    workspace.remove_asset(asset_ref);
                    try {
                        await database.remove(asset_ref);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });

        it('Cannot create an asset with an invalid asset', done => {
            const asset = {
                main: "/resources/test/a/test_005",
                comment: ["This shouldn't be an array"],
                tags: "this shouldn't be a string",
                dependencies: "this shouldn't be a string",
                semantics: "this shouldn't be a string"
            };

            const asset_ref = "/assets/levels/test_011.level";
            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
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

        it('Cannot create an asset with invalid asset path', done => {
            const asset = {
                main: "/resources/test/b/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };

            const asset_ref = "/assets/levels/test_011.level";
            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
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


        it('Cannot create an asset with invalid content type header', done => {
            const asset = {
                main: "/resources/test/b/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };

            const asset_ref = "/assets/levels/test_011.level";

            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
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

        it('Cannot create an asset that has common reference in "main" and "dependencies" values', done => {
            const asset_ref = '/assets/level';
            const asset = {
                main: "/resources/test",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test"],
                semantics: []
            };
            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(400)
                .end(async (err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });
        });


    });

    describe('Renaming assets!', function() {

        let test_002 = {
            meta: {
                ref: "/assets/levels/test_002.level"
            },
            main: "/resources/prefab/test",
            dependencies: [
                "/assets/levels/test_001.level"
            ]
        };
        let test_003 = {
            meta:{
                ref: "/assets/levels/test/003/test_003.level"
            },
            main: "/resources/test/a/test_005",
            dependencies: [
                "/assets/levels/test_001.level",
                "/assets/levels/test_005.level"
            ]
        };
        let test_005 = {
            meta:{
                ref: "/assets/levels/test_005.level"
            },
            main: "/resources/mall/mall_demo",
        };
        before("create referenced assets", done =>  {
            // test level
            test_002 = workspace.create_asset(test_002);
            test_003 = workspace.create_asset(test_003);
            test_005 = workspace.create_asset(test_005);
            Promise.all([
                database.add(test_002),
                database.add(test_003),
                database.add(test_005)
            ]).then(function(){
                done();
            }).catch(done);
        });

        after("remove referenced assets", done =>  {
            // test level
            const test04_ref = '/assets/levels/test/004/test_004.level';
            workspace.remove_asset(test_002.meta.ref);
            workspace.remove_asset(test_003.meta.ref);
            workspace.remove_asset(test04_ref);
            test_level_asset = workspace.create_asset(test_level_asset);
            Promise.all([
                database.remove(test_002.meta.ref),
                database.remove(test_003.meta.ref),
                database.remove(test04_ref),
                database.add(test_level_asset)
            ]).then(function(){
                done();
            }).catch(done);
        });

        it('Rename an asset', done =>  {
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
            const asset_path = workspace.get_internal_path(asset_ref);
            const new_asset_ref = '/assets/levels/test/004/test_004.level';
            client
                .post(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/rename${test_level_asset.meta.ref}`)
                .send({ new: new_asset_ref })
                .set("Content-Type", "application/json")
                .set("Accept", "application/json")
                .set("Last-Modified", workspace.read_asset(asset_ref).meta.modified)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.exist(obj);
                    should.equal(new_asset_ref, obj.ref);
                    let renamed_asset = workspace.read_asset(new_asset_ref);
                    should.equal(renamed_asset.meta.ref, new_asset_ref);
                    delete renamed_asset.meta;
                    should.deepEqual(renamed_asset, asset);

                    const test002_asset = workspace.read_asset(test_002.meta.ref);
                    should.equal(test002_asset.dependencies.indexOf(asset_ref), -1);
                    should.equal(test002_asset.dependencies.indexOf(new_asset_ref), 0);

                    const test003_asset = workspace.read_asset(test_003.meta.ref);
                    should.equal(test003_asset.dependencies.indexOf(asset_ref), -1);
                    should.equal(test003_asset.dependencies.indexOf(new_asset_ref), 0);

                    fs.readJson(asset_path, function(json){
                        should.equal(json.code, 'ENOENT');
                        done();
                    });
                });
        });

        it('Cannot rename an unexisted asset', done => {

            const new_asset_ref = '/assets/levels/test/004/test_004.level';
            client
                .post(path.join('/assetmanager/workspaces/', workspace.get_encoded_file_uri(), 'rename', '/assets/unvalid'))
                .send({ new: new_asset_ref})
                .set("Content-Type", "application/json")
                .set("Accept", "application/json")
                .set("Last-Modified", workspace.format_asset().meta.modified)
                .expect(404)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });
        });

        it('Cannot rename an asset with a none matching modified date', done =>  {

            const new_asset_ref = '/assets/levels/test/004/test_004.level';
            client
                .post(path.join('/assetmanager/workspaces/', workspace.get_encoded_file_uri(), 'rename', new_asset_ref))
                .send({ new: new_asset_ref})
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

        it('Cannot rename an unexisted asset', done => {

            client
                .post(path.join('/assetmanager/workspaces/', workspace.get_encoded_file_uri(), 'rename', test_003.meta.ref))
                .send({ new: '/invalid' })
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", workspace.read_asset(test_003.meta.ref).meta.modified)
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot rename an asset with invalid content-type header', done => {

            client
                .post(path.join('/assetmanager/workspaces/', workspace.get_encoded_file_uri(), 'rename', test_003.meta.ref))
                .send({ new: '/invalid' })
                .set("Content-Type", "application/invalid/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", workspace.read_asset(test_003.meta.ref).meta.modified)
                .expect(500)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

    });

    describe('Replacing asset data!', function() {

        it('Replace an asset data', done => {

            const asset = {
                comment: '',
                tags: [],
                main: '/resources/test/a/test_005',
                dependencies: ['/resources/mall/mall_demo'],
                semantics: []
            };

            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
                .send(asset)
                .set("Content-Type", "application/json")
                .set("accept", 'application/json')
                .set("Last-Modified", workspace.get_last_modified(test_level_asset.meta.ref))
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let object_returned = res.body;
                    const object_readed = workspace.read_asset(test_level_asset.meta.ref);
                    should.deepEqual(object_readed, object_returned);
                    delete object_readed.meta;
                    should.deepEqual(object_readed, asset);
                    done();
                });

        });

        // it('Replace an asset data with common reference in main and dependency references', done => {

        //     const asset = {
        //         comment: '',
        //         tags: [],
        //         main: '/resources/mall/mall_demo',
        //         dependencies: ['/resources/mall/mall_demo'],
        //         semantics: []
        //     };

        //     client
        //         .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
        //         .send(asset)
        //         .set("Content-Type", "application/json")
        //         .set("Accept", 'application/json')
        //         .set("Last-Modified", workspace.get_last_modified(test_level_asset.meta.ref))
        //         .expect(200)
        //         .end((err, res) => {
        //             if (err) {
        //                 return done({ error: err.toString(), status: res.status, body: res.body });
        //             }
        //             let object_returned = res.body;
        //             const object_readed = workspace.read_asset(test_level_asset.meta.ref);
        //             should.deepEqual(object_readed, object_returned);
        //             delete object_readed.meta;
        //             asset.dependencies.splice(0, 1);
        //             should.deepEqual(object_readed, asset);
        //             done();
        //         });

        // });

        it('Cannot replace with common dependency and main reference', done => {

            const asset = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": ["/resources/test/a/test_005"],
                "semantics": []
            };

            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
                .send(workspace.format_asset(asset))
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", workspace.get_last_modified(test_level_asset.meta.ref))
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot replace asset data with an invalid asset', done => {

            const asset = {
                "comment": {},
                "tags": "",
                "main": "/resources/test/a/test_005",
                "dependencies": "",
                "semantics": ""
            };

            const modified = workspace.get_last_modified(test_level_asset.meta.ref);

            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
                .send(workspace.format_asset(asset))
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

        it('Cannot replace asset data with invalid paths', done =>  {

            const asset = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": ["/resources/test/b/test_005"],
                "semantics": []
            };

            const modified = workspace.get_last_modified(test_level_asset.meta.ref);

            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
                .send(workspace.format_asset(asset))
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

        it('Delete an asset and checks subscription list is cleared up', done => {

            const asset_path = workspace.get_internal_path(test_level_asset.meta.ref);
            const subscription_reference = [{
                id: 1,
                type: 'ASSET',
                ref: test_level_asset.meta.ref
            }];
            workspace.create_workspace_resource([], subscription_reference);
            client
                .delete(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", workspace.format_asset().meta.modified)
                .expect(204)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    const workspace_resource = workspace.read_workspace_resource();
                    const is_sub_found = workspace_resource.subscriptions.find(({ id }) => id === subscription_reference.id);
                    should.equal(is_sub_found, null);
                    fs.readJson(asset_path, async json => {
                        should.equal(json.code, 'ENOENT');
                        test_level_asset = workspace.create_asset(test_level_asset);
                        try {
                            await database.add(test_level_asset);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });

        });

        it('Delete an asset that defines a removed resource', done => {

            const asset_path = workspace.get_internal_path(test_level_asset.meta.ref);
            workspace.remove_resource("/test/test");
            client
                .delete(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", workspace.format_asset().meta.modified)
                .expect(204)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    fs.readJson(asset_path, async json =>{
                        should.equal(json.code, 'ENOENT');
                        test_level_asset = workspace.create_asset(test_level_asset);
                        try {
                            await database.add(test_level_asset);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });

        });

        it('Cannot delete an asset with an not unexisted ref', done => {

            client
                .delete(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}/assets/invalid`)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .set("Last-Modified", workspace.format_asset().meta.modified)
                .expect(404)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });

        });

        it('Cannot delete an asset already referenced by another', done => {

            let reference_asset = {
                meta: {
                    ref: "/assets/levels/reference_asset.level",
                    modified: "2016-03-18T10:54:05.870Z",
                },
                main: "/resources/test/foo",
                dependencies: [
                    test_level_asset.meta.ref
                ]
            };
            reference_asset = workspace.create_asset(reference_asset);
            workspace.create_resource("test/foo", {});

            database.add(reference_asset).then(() => {

                client
                    .delete(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${test_level_asset.meta.ref}`)
                    .set("Content-Type", "application/json")
                    .set("Accept", 'application/json')
                    .set("Last-Modified", test_level_asset.meta.modified)
                    .expect(403)
                    .end((err, { status, body }) => {
                        if (err) {
                            return done({ error: err.toString(), status, body });
                        }
                        done();
                    });

            });

        });

        after("remove referenced assets", async () => {
            const reference_asset = '/assets/levels/reference_asset.level';
            workspace.remove_asset(reference_asset);
            await database.remove(reference_asset);
        });

    });
});
