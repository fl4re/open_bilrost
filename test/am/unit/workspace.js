/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const fs = require('fs-extra');
const should = require('should');
const path = require('path').posix;
const favorite = require('../../../assetmanager/favorite')();
const Test_util = require('../../util/test_util');

describe('Workspace object', function() {

    const test_util = new Test_util("workspace_object", "bad_repo");

    const Workspace = require('../../../assetmanager/workspace')({
        amazon_client: {},
        cache: {}
    });
    const Asset = require('../../../assetmanager/asset');

    const example1_workspace = {
        "guid": "e39d0f72c81c445ba801dsssssssssssssddsdss",
        "name": "feat/first-workspace",
        "description": "This is your first workspace cloned from DLC_1 branch !",
        "version": "2.0.0",
        "pushed_at": "2011-01-26T19:01:12Z",
        "created_at": "2011-01-26T19:01:12Z",
        "updated_at": "2011-01-26T19:14:43Z",
        "type": 'application/vnd.bilrost.workspace+json',
        "file_uri": test_util.path_to_file_uri(path.join(test_util.get_fixtures(), 'example1')),
        "tags": ["Hello", "World"],
        "subscriptions": [],
        "stage": []
    };

    const example2_workspace = {
        "guid": "e39d0f72c81c445ba8014f3999f576c7sdadswgg",
        "name": "feat/second-workspace",
        "description": "This is your first workspace cloned from DLC_1 branch !",
        "version": "2.0.0",
        "pushed_at": "2011-01-26T19:06:43Z",
        "created_at": "2011-01-26T19:01:12Z",
        "updated_at": "2011-01-26T19:14:43Z",
        "type": 'application/vnd.bilrost.workspace+json',
        "file_uri": test_util.path_to_file_uri(path.join(test_util.get_fixtures(), 'example2')),
        "tags": ["Hello", "World", "BIS"],
        "subscriptions": [],
        "stage": []
    };

    const mall = {
        "meta": {
            "ref": "/assets/prefab/mall.prefab",
            "type": "application/vnd.bilrost.prefab+json",
            "created": "2016-03-16T14:41:10.384Z",
            "modified": "2016-03-18T10:54:05.870Z",
            "author": "",
            "version": "1.1.0"
        },
        "comment": "",
        "tags": [],
        "main": "/resources/test/prefab/test",
        "dependencies": [],
        "semantics": []
    };

    function copy_source_folder_to(target) {
        fs.copySync(test_util.get_eloise_path(), test_util.file_uri_to_path(target));
    }

    function write_workspace_file(workspace_file) {
        const workspace_path = test_util.file_uri_to_path(workspace_file.file_uri);
        fs.outputJsonSync(path.join(workspace_path, '.bilrost/workspace'), workspace_file);
    }

    function write_project_file(uri, content) {
        const workspace_path = test_util.file_uri_to_path(uri);
        fs.outputJsonSync(path.join(workspace_path, '.bilrost/project'), content);
    }

    before("create fixtures", function(done) {
        this.timeout(10*this.timeout()); // = 10 * default = 10 * 2000 = 20s
        test_util.create_eloise_fixtures()
            .then(() => {
                // cleanup source repo folder of invalid assets
                test_util.remove_asset_file("/assets/asset_wrong_type.prefab");
                test_util.remove_asset_file("/assets/asset_wrong_schema.prefab");
                test_util.remove_asset_file("/assets/asset_invalid_path.prefab");
                test_util.remove_asset_file("/assets/prefab/test_2_1_0.prefab");
                test_util.remove_asset_file("/assets/prefab/test_1_0_0.prefab");
                test_util.remove_asset_file("/assets/test_1_0_0.level");
                test_util.write_asset_file('/assets/prefab/mall.prefab', mall);

                copy_source_folder_to(example1_workspace.file_uri);
                copy_source_folder_to(example2_workspace.file_uri);

                write_workspace_file(example1_workspace);
                write_workspace_file(example2_workspace);
                write_project_file(example1_workspace.file_uri, test_util.project1_file);
                write_project_file(example2_workspace.file_uri, test_util.project1_file);

                done();
            });
    });

    before("Flush favorite list", favorite.flush);
    after("Flush favorite list", favorite.flush);

    before('Insert workspace references to favorite list', function(){
        return favorite.add({
            name: example1_workspace.name,
            file_uri: example1_workspace.file_uri
        }).then(favorite.add({
            name: example2_workspace.name,
            file_uri: example2_workspace.file_uri
        }));

    });

    describe('-- Check workspaces are reachable', function(){
        it("Retrieve example1 and example2 workspaces only", function(done){
            Workspace.list().then(workspaces => {
                should.not.exist(workspaces.error);
                workspaces.should.have.lengthOf(2);
                //workspaces.should.containDeep([example1_workspace, example2_workspace]);
                done();
            }).catch(workspace => {
                done(workspace.error ? workspace.error : workspace);
            });
        });

        it("Retrieve example1 workspace only", function(done){
            Workspace.find_by_file_uri(example1_workspace.file_uri).then(workspace => {
                should.not.exist(workspace.error);
                workspace.properties.name.should.equal(example1_workspace.name);
                workspace.properties.should.containDeep(example1_workspace);
                done();
            }).catch(workspace => {
                done(workspace.error ? workspace.error : workspace);
            });
        });

        it('Check "filter" query paramaters for retrieving workspaces', function(done){
            Workspace.list({ filterName: example1_workspace.name }).then(function(workspaces){
                should.not.exist(workspaces.error);
                workspaces.should.have.lengthOf(1);
                //workspaces.should.containDeep([example1_workspace]);
                done();
            }).catch(workspace => {
                done(workspace.error?workspace.error : workspace);
            });
        });
    });

    describe('-- Check workspace locks', function() {
        it("Lock workspace when committing", function(done) {
            Workspace.find_by_file_uri(example1_workspace.file_uri)
                .then(workspace => {
                    workspace.commit_files('foo');
                    workspace.commit_files('foo');
                })
                .catch(err => {
                    if (err.message === "workspace is locked") {
                        done();
                    } else {
                        done(err);
                    }
                });
        });
        it("Lock workspace when subscribing", function(done) {
            Workspace.find_by_file_uri(example1_workspace.file_uri)
                .then(workspace => {
                    workspace.add_subscription('foo', 'bar');
                    workspace.add_subscription('foo', 'bar');
                })
                .catch(err => {
                    if (err.message === "workspace is locked") {
                        done();
                    } else {
                        done(err);
                    }
                });
        });
    });

    describe('-- Check we can get some assets', function(){

        const test_asset_ref = "/assets/test_1_1_0.level";

        it('Retrieve test asset', function(done){
            Workspace.find_by_file_uri(example1_workspace.file_uri).then(workspace => {
                should.not.exist(workspace.error);
                return Asset.find_asset_by_ref(workspace, test_asset_ref)
                    .then(function(asset){
                        asset.should.not.have.keys('error');
                        asset.output.should.containDeep(fs.readJsonSync(path.join(test_util.get_fixtures(), "example1/.bilrost", test_asset_ref)));
                        done();
                    });
            }).catch(workspace => {
                done(workspace.error ?workspace.error : workspace);
            });
        });

        it("Don't retrieve unknown asset", function(done) {
            Workspace.find_by_file_uri(example1_workspace.file_uri).then(workspace => {
                should.not.exist(workspace.error);
                return Asset.find_asset_by_ref(workspace, 'assets/unknown').then(function(){
                    done("Test fail, asset shouldn't exist");
                }).catch(function(error){
                    error.should.have.keys('statusCode', 'message', 'stack');
                    error.statusCode.should.equal(404);
                    done();
                });
            }).catch(workspace => {
                done(workspace.error ?workspace.error : workspace);
            });
        });

        const prefab1_relative = "/assets/$prefab/test_1_1_0.prefab";
        const prefab2_relative = "/assets/$prefab/mall.prefab";

        it("Retrieve assets in prefab namespace", function(done){
            Workspace.find_by_file_uri(example1_workspace.file_uri).then(workspace => {
                should.not.exist(workspace.error);
                return Asset.find_asset_by_ref(workspace, "/assets/prefab/").then(function(asset){
                    asset.should.not.have.keys('error');
                    asset.output.items.should.have.lengthOf(2);
                    asset.output.totalItems.should.equal(2);
                    asset.output.items.should.containDeep([
                        fs.readJsonSync(path.join(test_util.get_fixtures(), "example1/.bilrost", prefab1_relative)),
                        fs.readJsonSync(path.join(test_util.get_fixtures(), "example1/.bilrost", prefab2_relative))
                    ]);
                    done();
                });
            }).catch(workspace => {
                done(workspace.error ?workspace.error : workspace);
            });
        });

        it('Check "paging" query paramaters for retrieving assets in prefab namespace', function(done){
            Workspace.find_by_file_uri(example1_workspace.file_uri).then(workspace => {
                should.not.exist(workspace.error);
                return Asset.find_asset_by_ref(workspace, "/assets/prefab/", { maxResults : 1 }).then(function(asset){
                    should.not.exist(asset.error);
                    asset.output.items.should.have.lengthOf(1);
                    asset.output.totalItems.should.equal(2);
                    return Asset.find_asset_by_ref(workspace, "/assets/prefab/", { start : 1, maxResults : 1 }).then(function(asset){
                        should.not.exist(asset.error);
                        asset.output.items.should.have.lengthOf(1);
                        asset.output.totalItems.should.equal(2);
                        done();
                    });
                });
            }).catch(workspace => {
                done(workspace.error ?workspace.error : workspace);
            });

        });

        it('Check "filter" query paramaters for retrieving assets in prefab namespace', function(done){
            Workspace.find_by_file_uri(example1_workspace.file_uri).then(workspace => {
                should.not.exist(workspace.error);
                return Asset.find_asset_by_ref(workspace, "/assets/prefab/", { filterName: '*' }).then(function(asset){
                    asset.should.not.have.keys('error');
                    asset.output.items.should.have.lengthOf(2);
                    asset.output.totalItems.should.equal(2);
                    asset.output.items.should.containDeep([
                        fs.readJsonSync(path.join(test_util.get_fixtures(), "example1/.bilrost", prefab1_relative)),
                        fs.readJsonSync(path.join(test_util.get_fixtures(), "example1/.bilrost", prefab2_relative))
                    ]);
                    done();
                });
            }).catch(workspace => {
                done(workspace.error ?workspace.error : workspace);
            });
        });

    });

    describe('-- Check we can retrieve resources', () => {
        it('Retrieve mall resource from example1 workspace using name identifier', done => {
            Workspace.find_by_file_uri(example1_workspace.file_uri)
                .then(workspace => {
                    should.not.exist(workspace.error);
                    return workspace.resource.get("/resources/test/test")
                        .then(resource => {
                            resource.should.not.have.keys('error');
                            done();
                        });
                }).catch(workspace => {
                    done(workspace.error ? workspace.error : workspace);
                });
        });

        it("Don't retrieve unknown resource", done => {
            Workspace.find_by_file_uri(example1_workspace.file_uri)
                .then(workspace => {
                    should.not.exist(workspace.error);
                    return workspace.resource.get("/resources/unknown")
                        .then(() => {
                            done("This asset shouldn't exist");
                        });
                }).catch(resource => {
                    should.exist(resource.error);
                    resource.error.should.have.keys('statusCode', 'message', 'stack');
                    resource.error.statusCode.should.equal(404);
                    done();
                });
        });

        it("Retrieve resources in root folder", done => {
            Workspace.find_by_file_uri(example1_workspace.file_uri)
                .then(workspace => {
                    should.not.exist(workspace.error);
                    return workspace.resource.get()
                        .then(resource => {
                            resource.output.items.should.have.lengthOf(3);
                            resource.output.totalItems.should.equal(3);
                            done();
                        });
                }).catch(workspace => {
                    done(workspace.error ? workspace.error : workspace);
                });
        });

        it('Check "paging" query paramaters for retrieving resources in root folder', done => {
            Workspace.find_by_file_uri(example1_workspace.file_uri).then(workspace => {
                should.not.exist(workspace.error);
                return workspace.resource.get("", { maxResults : 1 })
                    .then(resource => {
                        resource.output.items.should.have.lengthOf(1);
                        resource.output.totalItems.should.equal(3);
                        return resource.get("", { start:1, maxResults : 1 })
                            .then(resource => {
                                resource.output.items.should.have.lengthOf(1);
                                resource.output.totalItems.should.equal(3);
                                done();
                            });
                    });
            }).catch(workspace => {
                done(workspace.error ?workspace.error : workspace);
            });
        });
    });

});
