/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const mock_workspace = require('../util/mocks/workspace');
const favorite = require('../../assetmanager/favorite')();
const Asset = require('../../assetmanager/asset');
const Test_util = require('../util/test_util');

describe('Run set of test for asset management methods', function() {
    const test_util = new Test_util("unit_asset", "good_repo");

    let workspace, asset_instance;

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

    const ifs_map = {
        "readJson" : {
            ".bilrost/assets/prefab/test_1_0_0.prefab": () => Promise.reject("can't be open"),
            ".bilrost/assets/asset_wrong_schema.prefab": () => Promise.reject("can't be open"),
            ".bilrost/assets/prefab/test_2_1_0.prefab": () => Promise.reject("can't be open"),
            ".bilrost/assets/asset_wrong_type.prefab": () => Promise.reject("can't be open"),
            ".bilrost/assets/asset_invalid_path.prefab": () => Promise.reject("can't be open"),
            ".bilrost/assets/test_1_0_0.level": () => Promise.reject("can't be open"),
            ".bilrost/assets/test_1_1_0.level": () => Promise.reject("can't be open"),
            ".bilrost/assets/prefab/mall.prefab": () => Promise.resolve({
                meta: {
                    ref: '/assets/prefab/mall.prefab',
                    type: 'application/vnd.bilrost.prefab+json',
                    created: '2016-03-16T14:41:10.384Z',
                    modified: '2016-03-18T10:54:05.870Z',
                    author: '',
                    version: '1.1.0'
                },
                comment: '',
                tags: [],
                main: '/resources/test/test01',
                dependencies: [],
                semantics: []
            }),
            ".bilrost/assets/prefab/test_1_1_0.prefab": () => Promise.resolve({
                meta: {
                    ref: '/assets/prefab/test_1_1_0.prefab',
                    type: 'application/vnd.bilrost.prefab+json',
                    created: '2016-03-16T14:41:10.384Z',
                    modified: '2016-03-18T10:54:05.870Z',
                    author: '',
                    version: '1.1.0'
                },
                comment: 'This is a test asset!',
                tags: [ 'TEST' ],
                main: '/resources/test/test03',
                dependencies: [ '/resources/test/prefab/test' ],
                semantics: []
            })
        },
        "access" : {
            "test/test_001" : () => Promise.resolve(),
            "test/a/test_005" : () => Promise.resolve(),
            "test/b/test_005" : () => Promise.resolve(),
            "mall/mall_demo" : () => Promise.resolve(),
            "resources/test/a/test_005" : () => Promise.resolve(),
            "test/unexisted_folder/test_001" : () => Promise.reject("Can't be accessed!"),
            "b/test_005" : () => Promise.reject("Can't be accessed!")
        },
        "getDirectories" : {
            "/.bilrost/asset/levels/test_001.level" : Promise.resolve([]),
            "/.bilrost/invalid_ref" : Promise.resolve([]),
            "/.bilrost/dasa" : Promise.resolve([]),
        }
    };

    before("create fixtures", function(done) {
        this.timeout(3*this.timeout()); // = 3 * default = 3 * 2000 = 6000
        test_util.create_eloise_fixtures()
            .then(() => test_util.create_eloise_workspace_project_file())
            .then(() => test_util.create_eloise_workspace_properties_file())
            .then(() => {
                test_util.write_asset_file('/assets/levels/test_001.level', test_level);

                // data folders and files
                test_util.write_eloise_resource_file('/test/test_001', 'foo');
                test_util.write_eloise_resource_file('/mall/mall_demo', 'foo');
                test_util.write_eloise_resource_file('/test/a/test_005', 'foo');
                test_util.write_eloise_resource_file('/.bilrost/project', test_util.project1_file);
                return mock_workspace(test_util.eloise.guid, test_util.get_eloise_path(), "s3", ifs_map, "good_repo")
                    .then(wrkspc => {
                        workspace = wrkspc;
                        asset_instance = wrkspc.asset;
                        done();
                    }, done);
            }).catch(done);

    });

    before(() => favorite.flush());
    before(() => favorite.add(test_util.get_eloise_identifiers()));

    after("Flush search index map", function(done) {
        workspace.database.close()
            .then(() => favorite.remove(test_util.eloise.guid))
            .then(done, done);
    });

    describe('Searching with #find_asset_by_ref', () => {
        const Workspace = require('../../assetmanager/workspace')({
            amazon_client: '',
            cache: {}
        });
        let this_workspace;
        before(() => Workspace.find(test_util.eloise.name)
            .then(wrkspc => this_workspace = wrkspc));

        it('retrieves test asset', function() {
            return Asset.find_asset_by_ref(this_workspace, test_level.meta.ref)
                .then(result => {
                    test_level.should.deepEqual(result.output);
                });
        });

        it("doesn't retrieve unknown asset", function() {
            return Asset.find_asset_by_ref(this_workspace, '/assets/unknown')
                .then(
                    () => {throw new Error('This should not resolve.');},
                    error => error.statusCode.should.equal(404));
        });

        it("retrieves assets in prefab namespace", function() {
            return Asset.find_asset_by_ref(this_workspace, '/assets/prefab/').then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(2);
                    asset_list.items.length.should.equal(2);
                });
        });

        it('retrieves assets in prefab namespace with maxResults', function(){
            return Asset.find_asset_by_ref(this_workspace, '/assets/prefab/', {maxResults: 1}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(2);
                    asset_list.items.length.should.equal(1);
                    const found_item = asset_list.items.find(item => item.meta.ref === '/assets/prefab/mall.prefab' ||  item.meta.ref === '/assets/prefab/test_1_1_0.prefab');
                    should.exist(found_item);
                });
        });

        it('retrieves assets in prefab namespace with start', function(){
            return Asset.find_asset_by_ref(this_workspace, '/assets/prefab/', {start: 1}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(2);
                    asset_list.items.length.should.equal(1);
                    const found_item = asset_list.items.find(item => item.meta.ref === '/assets/prefab/mall.prefab' ||  item.meta.ref === '/assets/prefab/test_1_1_0.prefab');
                    should.exist(found_item);
                });
        });

        it('retrieves assets in prefab namespace with filterName to match all', function(){
            return Asset.find_asset_by_ref(this_workspace, '/assets/prefab/', {filterName: '*'}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(2);
                    asset_list.items.length.should.equal(2);
                });
        });

        it('retrieves assets in prefab namespace with filterName to match one', function(){
            return Asset.find_asset_by_ref(this_workspace, '/assets/prefab/', {filterName: '*1_1_0*'}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(1);
                    asset_list.items.length.should.equal(1);
                });
        });

        it('retrieves assets in root namespace with query', function(){
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: 'mall'}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(1);
                    asset_list.items.length.should.equal(1);
                    asset_list.items[0].meta.ref.should.equal('/assets/prefab/mall.prefab');
                });
        });

        it('retrieves assets in root namespace with query to find all levels', function(){
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: '.level'}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(2);
                    asset_list.items.length.should.equal(2);
                    asset_list.items[0].meta.ref.should.equal('/assets/test_1_1_0.level');
                });
        });

        it('retrieves assets in root namespace with query to find all levels OR test prefab', function(){
            const query = '.level OR test tag: TEST';
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: query}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(3);
                    asset_list.items.length.should.equal(3);
                    asset_list.items[0].meta.ref.should.equal('/assets/test_1_1_0.level');
                });
        });

        it('retrieves assets in root namespace with complex query', function(){
            const query = "type: level AND NOT (1_1_0 OR tag: TEST)";
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: query}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(0);
                    asset_list.items.length.should.equal(0);
                });
        });

        it('retrieves assets in root namespace with query to find dates', function(){
            const query = 'created:.. 2000 2040 AND comment: "test asset!"';
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: query}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(1);
                    asset_list.items.length.should.equal(1);
                    asset_list.items[0].meta.ref.should.equal('/assets/prefab/test_1_1_0.prefab');
                });
        });

        it('retrieves assets in root namespace with query to find dependency', function(){
            const query = 'dependency: /resources/test/test';
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: query}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(1);
                    asset_list.items.length.should.equal(1);
                    asset_list.items[0].meta.ref.should.equal('/assets/test_1_1_0.level');
                });
        });

        it('fails to retrieve assets in root namespace with query to non existing dependency', function(){
            const query = 'dependency: /resources/test/test.invalid';
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: query}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(0);
                    asset_list.items.length.should.equal(0);
                });
        });

        it('retrieves assets in root namespace with query to find tag', function(){
            const query = 'tag: TEST';
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: query}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(1);
                    asset_list.items.length.should.equal(1);
                    asset_list.items[0].meta.ref.should.equal('/assets/prefab/test_1_1_0.prefab');
                });
        });

        it('fails to retrieve assets in root namespace with query to non existing tag', function(){
            const query = 'tag: TESTWRONG';
            return Asset.find_asset_by_ref(this_workspace, '/assets/', {q: query}).then(result => result.output)
                .then(asset_list => {
                    asset_list.totalItems.should.equal(0);
                    asset_list.items.length.should.equal(0);
                });
        });
    });

    describe('Creating assets!', function() {

        it('Create an asset', function(done){
            this.timeout(3*this.timeout()); // = 3 * default = 3 * 2000 = 6000
            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["test", "hello"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };
            const asset_ref = '/assets/levels/test_002.level';

            asset_instance.create(asset_ref, asset).then(function(asset){
                should.exist(asset);
                delete asset.created;
                delete asset.modified;
                should.deepEqual(asset, {
                    ref: '/assets/levels/test_002.level',
                    author: 'unknown',
                    version: '1.1.0'
                });
                test_util.remove_asset_file(asset_ref);
                return workspace.database.remove(asset_ref).then(() => done());
            }).catch(done);
        });

        it('Create an empty asset', function(done){
            this.timeout(3*this.timeout()); // = 3 * default = 3 * 2000 = 6000
            const asset = {};
            const asset_ref = '/assets/levels/test_002.level';

            asset_instance.create(asset_ref, asset).then(function(asset){
                should.exist(asset);
                delete asset.created;
                delete asset.modified;
                should.deepEqual(asset, {
                    ref: '/assets/levels/test_002.level',
                    author: 'unknown',
                    version: '1.1.0'
                });
                test_util.remove_asset_file(asset_ref);
                workspace.database.remove(asset_ref).then(function() {
                    done();
                }).catch(done);
            }).catch(done);
        });

        it('Cannot create an asset with already existed ref', function(done){
            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["test", "hello"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };

            asset_instance.create(test_level.meta.ref, asset).then(function(){
                done("An asset shouldn't be created");
            }).catch(function(error){
                should.exist(error);
                error.statusCode.should.equal(403);
                done();
            });
        });

        it('Cannot create an asset with an invalid ref', function(done){
            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["test", "hello"],
                dependencies: ["/resources/test/test_001"],
                semantics: []
            };
            const asset_ref = '/asset/levels/test_001.level';

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
                main: "/resources/b/test_005",
                comment: "This a test asset",
                tags: ["test", "hello"],
                dependencies: ["/resources/test/unexisted_folder/test_001"],
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
                tags: ["test", "hello"],
                dependencies: [],
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

    });

    describe('Renaming assets!', function() {

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
            Promise.all([
                workspace.database.add(test_002),
                workspace.database.add(test_003)
            ]).then(function(){
                done();
            }).catch(done);
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

        it('Rename an asset', function(done){
            /*            let asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/test_001",
                "dependencies": [
                    "/resources/mall/mall_demo"
                ],
                "semantics": []
            };

            const asset_ref = '/assets/levels/test_001.level';*/
            const new_asset_ref = '/assets/levels/test/004/test_004.level';

            asset_instance.rename(test_level.meta.ref, new_asset_ref, test_level.meta.modified).then(function(asset){
                should.exist(asset);
                should.equal(new_asset_ref, asset.ref);
                done();
                // The following checks are commented out because it fails.
                // To test properly the ifs_map/workspace_mock should be more elaborated
                // to be able to handle all the FS operation that a rename involves
                // Meanwhile we rely on the am/functional/model tests that cover this same
                // functionality with fully created workspaces.
                /*let renamed_asset = test_util.read_asset_file(new_asset_ref);
                should.equal(renamed_asset.meta.ref, new_asset_ref);
                delete renamed_asset.meta;
                should.deepEqual(renamed_asset, asset_data);

                let test002_asset = test_util.read_asset_file(test_002.meta.ref);
                should.equal(test002_asset.dependencies.indexOf(asset_ref),-1);
                should.equal(test002_asset.dependencies.indexOf(new_asset_ref),0);

                let test003_asset = test_util.read_asset_file(test_003.meta.ref);
                should.equal(test003_asset.dependencies.indexOf(asset_ref),-1);
                should.equal(test003_asset.dependencies.indexOf(new_asset_ref),0);

                asset.database.search({ ref: test_level.meta.ref })
                    .then(function(search_results) {
                        search_results.totalItems.should.equal(0);
                        asset.database.search({ ref: new_asset_ref })
                        .then(function(search_results) {
                            search_results.totalItems.should.equal(1);
                            test_util.read_asset_file(asset_ref, function(read_output) {
                                should.equal(read_output.code, 'ENOENT');
                                done();
                            });
                        });
                    });

*/
            }).catch(done);
        });

        it('Cannot rename an asset with an unexisted ref', function(done){

            const new_asset_ref = '/assets/levels/test/004/test_004.level';

            asset_instance.rename("/assets/invalid_ref", new_asset_ref, test_level.meta.modified).then(function(){
                done("this asset shouldn't exist");
            }).catch(function(error) {
                should.exist(error);
                should.equal(error.statusCode, 404);
                done();
            });

        });

        it('Cannot rename an asset with an unvalid ref', function(done){

            const new_asset_ref = '/assets/levels/test/004/test_004?.level';

            asset_instance.rename(test_003.meta.ref, new_asset_ref, test_level.meta.modified).then(function(){
                done("this asset shouldn't exist");
            }).catch(function(error) {
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });

        });

        it('Cannot rename an asset with a none matching modified date', function(done) {

            const new_asset_ref = '/assets/levels/test/004/test_004.level';

            asset_instance.rename(test_003.meta.ref, new_asset_ref, "2016-03-18T10:54:05.860Z").then(function(){
                done("this asset shouldn't exist");
            }).catch(function(error) {
                should.exist(error);
                should.equal(error.statusCode, 412);
                done();
            });

        });

        it('Cannot rename an asset with an invalid new ref', function(done) {

            asset_instance.rename(test_003.meta.ref, "/invalid_ref", test_level.meta.modified).then(function(){
                done("this asset shouldn't exist");
            }).catch(function(error){
                should.exist(error);
                should.equal(error.statusCode, 400);
                done();
            });

        });

    });

    describe('Deleting assets!', function() {

        it('Delete an asset', function(done){

            asset_instance.delete(test_level.meta.ref).then(function(){
                workspace.database.search({ ref: test_level.meta.ref })
                    .then(function(search_results) {
                        search_results.totalItems.should.equal(0);
                        workspace.database.add(test_level).then(function() {
                            done();
                        }).catch(done);
                    });
            }).catch(error => done(error));

        });

        it('Cannot delete an asset with an unexisted ref', function(done){

            asset_instance.delete('/invalid_asset').then(function(){
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
            test_util.write_asset_file(test_level.meta.ref, reference_asset);
            workspace.database.add(reference_asset).then(function() {
                asset_instance.delete(test_level.meta.ref).then(function(){
                    done("An asset shouldn't be deleted");
                }).catch(function(error){
                    should.exist(error);
                    should.equal(error.statusCode, 403);
                    done();
                });
            });

        });
    });

    describe('Replacing asset resources!', function() {

        it('Replace asset data', function(done){

            const asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": [],
                "semantics": []
            };

            asset_instance.replace(test_level.meta.ref, asset_data, test_level.meta.modified).then(function(){
                workspace.database.search({ ref: test_level.meta.ref })
                    .then(function(search_results) {
                        should.equal(search_results.items.length, 1);
                        done();
                    });
            }).catch(error => done(error));

        });

        it('Cannot replace asset data with an unvalid asset ref', function(done){

            const asset_data = {
                "comment": "",
                "tags": [],
                "main": "/resources/test/a/test_005",
                "dependencies": [],
                "semantics": []
            };

            asset_instance.replace("/assets/dasa", asset_data, test_level.meta.modified).then(function(){
                done("The asset data shouldn't be replaced");
            }).catch(error => {
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

            asset_instance.replace(test_level.meta.ref, asset_data, "2016-03-18T10:54:05.860Z").then(function(){
                done("The asset data shouldn't be replaced");
            }).catch(error => {
                should.exist(error);
                should.equal(error.statusCode, 412);
                done();
            });

        });

    });

});
