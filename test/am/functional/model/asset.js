/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Print stack trace for debugging
global.debug = true;

const fs = require('fs-extra');
const should = require('should');
const path = require('path').posix;
const favorite = require('../../../../assetmanager/favorite')();
const Workspace = require('../../../../assetmanager/workspace')({
    amazon_client: {},
    cache: {}
});
const asset = require('../../../../assetmanager/asset');
const Test_util = require('../../../util/test_util');
const svn_repo_name = 'bad_repo';

let workspace, asset_instance;

const isWin = /^win/.test(process.platform);

var test_util = new Test_util("model_asset", "bad_repo");
const fixtures = test_util.get_fixtures();

let example_file_uri = path.join(fixtures, svn_repo_name);
example_file_uri = 'file://'+ (isWin?'/':'') + example_file_uri;

const test_level = {
    "meta":{
        "ref": "/assets/levels/test_001.level",
        "type": "application/vnd.bilrost.level+json",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "version":"1.1.0",
        "author": ""
    },
    "comment": "",
    "tags": [],
    "main": "/resources/test/test_001",
    "dependencies": [
        "/resources/mall/mall_demo"
    ],
    "semantics": []
};

const workspace_identifiers = {
    guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
    name: "test-workspace",
    file_uri: example_file_uri,
    version_id: "5"
};

describe('Run set of test for asset management methods', function () {

    before("Starting a Content Browser server", done => test_util.start_server(done, {
        bilrost_client: {}
    }));

    before(() => favorite.flush());

    before("create fixtures", function(done) {
        this.timeout(5*this.timeout()); // = 3 * default = 3 * 2000 = 6000
        test_util.create_eloise_fixtures()
            .then(() => test_util.create_eloise_workspace_project_file())
            .then(() => test_util.create_eloise_workspace_properties_file())
            .then(() => {
                // cleanup invalid assets
                test_util.remove_asset_file("/assets/asset_wrong_type.prefab");
                test_util.remove_asset_file("/assets/asset_wrong_schema.prefab");
                test_util.remove_asset_file("/assets/asset_invalid_path.prefab");
                test_util.remove_asset_file("/assets/prefab/test_2_1_0.prefab");
                test_util.remove_asset_file("/assets/prefab/test_1_0_0.prefab");
                test_util.remove_asset_file("/assets/test_1_0_0.level");

                // test level
                test_util.write_asset_file('/assets/levels/test_001.level', test_level);

                // data folders and files
                test_util.write_eloise_resource_file('/test/test_001', 'foo');
                test_util.write_eloise_resource_file('/mall/mall_demo', 'foo');
                test_util.write_eloise_resource_file('/test/a/test_005', 'foo');

                done();

            }).catch(done);

    });

    before("Instance asset object", done => {
        favorite.add(workspace_identifiers)
            .then(() => Workspace.find_by_file_uri(workspace_identifiers.file_uri))
            .then(wrkspc => {
                workspace = wrkspc;
                asset_instance = asset(wrkspc);
                done();
            }).catch(workspace => {
                done(workspace);
            });
    });

    after("Flush search index map", function (done) {
        workspace.database.close()
            .then(() => favorite.remove(workspace_identifiers.guid))
            .then(done, done);
    });

    describe('Creating assets!', function () {

        it('Create an asset', function(done){
            this.timeout(3*this.timeout()); // = 3 * default = 3 * 2000 = 6000
            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };
            const asset_ref = '/assets/levels/test_002.level';
            asset_instance.create(asset_ref, asset).then(function(asset){
                should.exist(asset);
                let output = test_util.read_asset_file(asset_ref);
                delete output.meta;
                should.deepEqual( output, {
                    main: "/resources/test/a/test_005",
                    comment: "This a test asset",
                    tags: ["hello", "test"],
                    dependencies: ["/resources/test/test_001"],
                    semantics: []
                });
                test_util.remove_asset_file(asset_ref);
                workspace.database.remove(asset_ref).then(function () {
                    done();
                }).catch(done);
            }).catch(done);
        });

        it('Cannot create an asset with already existed ref', function(done){
            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };

            asset_instance.create( test_level.meta.ref, asset).then(function(){
                done("An asset shouldn't be created");
            }).catch(function(error){
                should.exist(error);
                error.statusCode.should.equal(403);
                done();
            }).catch(done);
        });

        it('Cannot create an asset with an invalid ref', function(done){
            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };
            const asset_ref = '/asse/levels/test_001.level';

            asset_instance.create(asset_ref, asset).then(function(){
                done("An asset shouldn't be created");
            }).catch(function(error){
                should.exist(error);
                error.statusCode.should.equal(400);
                done();
            });
        });

        it('Cannot create an asset with an invalid asset data', function(done){
            const asset_data = {
                main: "/resources/test/a/test_005",
                comment: ["This shouldn't be an array"],
                tags: "this shouldn't be a string",
                dependencies: "this shouldn't be a string",
                semantics: "this shouldn't be a string"
            };
            const asset_ref = '/assets/levels/test_011.level';

            asset_instance.create(asset_ref, asset_data).then(function(){
                done("An asset shouldn't be created");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });
        });

        it('Cannot create an asset with invalid asset data paths', function(done){
            const asset_data = {
                main: "/resources/test/b/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };
            const asset_ref = '/assets/levels/test_002.level';

            asset_instance.create(asset_ref, asset_data).then(function(){
                done("An asset shouldn't be created");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });
        });

        it('Cannot create an asset with already referenced main dependency', function(done){
            const asset_data = {
                main: "/resources/test/test_001",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: [],
                semantics: []
            };
            const asset_ref = '/assets/levels/test_002.level';

            asset_instance.create( asset_ref, asset_data).then(function(){
                done("An asset shouldn't be created");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });
        });


    });

    describe('Renaming assets!', function () {

        const test_002 = {
            "meta":{
                "ref": "/assets/levels/test_002.level",
                "type": "application/vnd.bilrost.level+json",
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
                "type": "application/vnd.bilrost.level+json",
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

        before("create referenced assets", function(done) {
            // test level
            test_util.write_asset_file(test_002.meta.ref, test_002);
            test_util.write_asset_file(test_003.meta.ref, test_003);
            Promise.all([
                workspace.database.add(test_002),
                workspace.database.add(test_003)
            ]).then(function(){
                done();
            }).catch(done);
        });

        it('Rename an asset', function(done){
            let asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/test_001",
                "dependencies": [
                    "/resources/mall/mall_demo"
                ],
                "semantics": []
            };

            const asset_ref = '/assets/levels/test_001.level';
            const new_asset_ref = '/assets/levels/test/004/test_004.level';

            asset_instance.rename( test_level.meta.ref, new_asset_ref, test_level.meta.modified ).then(function(result){
                should.exist( result );
                should.equal( new_asset_ref, result.ref );
                let renamed_asset = test_util.read_asset_file(new_asset_ref);
                should.equal( renamed_asset.meta.ref, new_asset_ref );
                delete renamed_asset.meta;
                should.deepEqual( renamed_asset, asset_data );

                let test002_asset = test_util.read_asset_file( test_002.meta.ref );
                should.equal(test002_asset.dependencies.indexOf(asset_ref),-1);
                should.equal(test002_asset.dependencies.indexOf(new_asset_ref),0);

                let test003_asset = test_util.read_asset_file( test_003.meta.ref );
                should.equal(test003_asset.dependencies.indexOf(asset_ref),-1);
                should.equal(test003_asset.dependencies.indexOf(new_asset_ref),0);

                workspace.database.search({ ref: test_level.meta.ref })
                    .then(function (search_results) {
                        search_results.totalItems.should.equal(0);
                        workspace.database.search({ ref: new_asset_ref })
                        .then(function (search_results) {
                            search_results.totalItems.should.equal(1);
                            test_util.read_asset_file( asset_ref, function (read_output) {
                                should.equal( read_output.code, 'ENOENT' );
                                done();
                            });
                        });
                    });


            }).catch(error => done(error));
        });

        after("remove referenced assets", function(done) {
            // test level
            const test04_ref = '/assets/levels/test/004/test_004.level';
            test_util.remove_asset_file(test_002.meta.ref);
            test_util.remove_asset_file(test_003.meta.ref);
            test_util.remove_asset_file(test04_ref);
            test_util.write_asset_file('/assets/levels/test_001.level', test_level);
            Promise.all([
                workspace.database.remove(test_002.meta.ref),
                workspace.database.remove(test_003.meta.ref),
                workspace.database.remove(test04_ref),
                workspace.database.add(test_level)
            ]).then(function(){
                done();
            }).catch(done);
        });

        it('Cannot rename an asset with an unexisted ref', function(done){

            const new_asset_ref = '/assets/levels/test/004/test_004.level';

            asset_instance.rename( "/assets/invalid_ref", new_asset_ref, test_level.meta.modified ).then(function(wrkspc){
                done("this asset shouldn't exist");
            }).catch( function(error) {
                should.exist(error);
                should.equal(error.statusCode, 404);
                done();
            });

        });

        it('Cannot rename an asset with an unvalid ref', function(done){

            const new_asset_ref = '/assets/levels/test/004/test_004?.level';

            asset_instance.rename( test_003.meta.ref, new_asset_ref, test_level.meta.modified ).then(function(wrkspc){
                done("this asset shouldn't exist");
            }).catch( function(error) {
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });

        });

        it('Cannot rename an asset with a none matching modified date', function(done) {

            const new_asset_ref = '/assets/levels/test/004/test_004.level';

            asset_instance.rename( test_003.meta.ref, new_asset_ref, "2016-03-18T10:54:05.860Z" ).then(function(wrkspc){
                done("this asset shouldn't exist");
            }).catch( function(error) {
                should.exist(error);
                should.equal(error.statusCode, 412);
                done();
            });

        });

        it('Cannot rename an asset with an invalid new ref', function(done) {

            asset_instance.rename( test_003.meta.ref, "/invalid_ref", test_level.meta.modified ).then(function(wrkspc){
                done("this asset shouldn't exist");
            }).catch(function(error){
                should.exist(error);
                should.equal( error.statusCode, 400 );
                done();
            });

        });

    });

    describe('Deleting assets!', function () {

        it('Delete an asset', function(done){

            const asset_path = path.join( test_util.get_eloise_path(), '.bilrost', test_level.meta.ref);
            asset_instance.delete( test_level.meta.ref ).then(function(){
                return workspace.database.search({ ref: test_level.meta.ref })
                    .then(function (search_results) {
                        search_results.totalItems.should.equal(0);
                        return fs.readJson( asset_path, function(json){
                            should.equal( json.code, 'ENOENT' );
                            workspace.database.add(test_level).then(function() {
                                done();
                            }).catch(done);
                        });
                    });
            }).catch(error => done(error));

        });

        it('Cannot delete an asset with an not unexisted ref', function(done){

            asset_instance.delete( '/invalid_asset' ).then(function(){
                done("An asset shouldn't be deleted");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 404);
                done();
            });
        });

        it('Cannot delete an asset already referenced by another', function(done){

            const reference_asset = {
                "meta":{
                    "ref": "/assets/levels/reference_asset.level",
                    "type": "application/vnd.bilrost.level+json",
                    "created": "2016-03-16T14:41:10.384Z",
                    "modified": "2016-03-18T10:54:05.870Z",
                    "version":"1.1.0",
                    "author": ""
                },
                "comment": "",
                "tags": [],
                "main": "/resources/test/test_001",
                "dependencies": [
                    test_level.meta.ref
                ],
                "semantics": []
            };
            test_util.write_asset_file( test_level.meta.ref, reference_asset);
            workspace.database.add(reference_asset).then(function() {
                asset_instance.delete( test_level.meta.ref ).then(function(){
                    done("An asset shouldn't be deleted");
                }).catch(function(error){
                    should.exist(error);
                    should.equal(error.statusCode, 403);
                    done();
                });
            });

        });

        after("remove referenced assets", function(done) {
            const reference_path = '/assets/levels/reference_asset.level';
            test_util.remove_asset_file(reference_path);
            workspace.database.remove(reference_path).then(function() {
                done();
            }).catch(done);
        });
    });

    describe('Replacing asset resources!', function () {

        it('Replace asset data', function(done){

            const asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": [],
                "semantics": []
            };
            asset_instance.replace( test_level.meta.ref, asset_data, test_level.meta.modified ).then(function(){
                workspace.database.search({ ref: test_level.meta.ref })
                    .then(function (search_results) {
                        const object_readed = test_util.read_asset_file(test_util.get_test_level().meta.ref);
                        search_results.items[0].should.deepEqual(object_readed);
                        object_readed.should.containDeep(asset_data);
                        done();
                    });
            }).catch(function(workspace) {
                done(workspace.error);
            });

        });


        it('Cannot replace asset data with an unvalid asset ref', function(done){

            const asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": [],
                "semantics": []
            };

            asset_instance.replace( "/assets/dasa", asset_data, test_level.meta.modified ).then(function(){
                done("The asset data shouldn't be replaced");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 404);
                done();
            });

        });

        it('Cannot replace asset data with a none matching modified date', function(done){

            const asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": [],
                "semantics": []
            };

            asset_instance.replace( test_level.meta.ref, asset_data, "2016-03-18T10:54:05.860Z" ).then(function(){
                done("The asset data shouldn't be replaced");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 412);
                done();
            });

        });

        it('Cannot replace asset data with invalid info', function(done){

            const asset_data = {
                "comment": {},
                "tags": "",
                "main": "/resources/test/a/test_005",
                "dependencies": "",
                "semantics": ""
            };

            const modified = test_util.read_asset_file(test_level.meta.ref).meta.modified;

            asset_instance.replace( test_level.meta.ref, asset_data, modified ).then(function(){
                done("The asset data shouldn't be replaced");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });

        });

        it('Cannot replace asset data with invalid paths', function(done){

            const asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": ["/resources/test/b/test_005"],
                "semantics": []
            };

            const modified = test_util.read_asset_file(test_level.meta.ref).meta.modified;

            asset_instance.replace( test_level.meta.ref, asset_data, modified ).then(function(){
                done("The asset data shouldn't be replaced");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });

        });

    });

});
