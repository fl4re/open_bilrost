/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const Path = require('path').posix;
const favorite = require('../../assetmanager/favorite')();
const Asset_integrity_status = require('../../assetmanager/integrity_status').Asset;
const Workspace_integrity_status = require('../../assetmanager/integrity_status').Workspace;
const ifs_adapter = require('../util/mocks/ifs_adapter');
const Test_util = require('../util/test_util');
const assets_collection = require('../../assetmanager/databases/assets_collection');
const status_collection = require('../../assetmanager/databases/status_collection');
const workspace_utilities = require('../../assetmanager/workspace_utilities');

const test_util = new Test_util("fixtures_status", "bad_repo");

let asset_status_instance, workspace_status_instance, database, collection;

const example_workspace = {
    "name": "test-workspace",
    "guid": "e39d0f72c81c445ba801dsssssss45219sddsdss",
    "host_vcs": "s3",
    "description": "This is your first workspace cloned from DLC_1 branch !",
    "version": "2.0.0",
    "created_at": "2011-01-26T19:01:12Z",
    "updated_at": "2011-01-26T19:14:43Z",
    "tags": ["Hello", "World"],
    "type": "application/vnd.bilrost.workspace+json",
    "file_uri": "file:///a/b",
    "subscriptions": [],
    "stage": [],
};

const example_project = {
    "name": "open_bilrost_test_project",
    "organization": "StarbreezeStudios",
    "version": "2.0.0",
    "full_name": "fl4re/open_bilrost_test_project",
    "url": "https://api.github.com/repos/fl4re/open_bilrost_test_project",
    "tags": [
        "Hello",
        "World"
    ],
    "host_vcs": "s3",
    "pushed_at": "2016-06-28T16:19:51Z",
    "created_at": "2016-06-27T18:31:40Z",
    "updated_at": "2016-11-17T20:15:11Z",
    "type": "application/vnd.bilrost.project+json",
    "properties": {
        "ignore": [
            ".bilrost/workspace",
            ".bilrost/search_index_keystore"
        ]
    }
};

const ifs_map = {
    "readdir" : {
        "/.bilrost" : [
            {   dev: 1761243593,
                mode: 16822,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: undefined,
                ino: 9851624186054086,
                size: 0,
                blocks: undefined,
                atime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                mtime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                ctime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                birthtime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                name: 'assets',
                extension: '',
                mime: 'application/octet-stream',
                path: Path.join(test_util.get_fixtures(), 'workspace-dev-test/.bilrost/assets'),
                hasChildren: true,
                isDirectory : () => true
            },
            {
                dev: 1761243593,
                mode: 16822,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: undefined,
                ino: 49258120925549010,
                size: 0,
                blocks: undefined,
                atime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                mtime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                ctime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                birthtime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                name: 'search_index_keystore',
                extension: '',
                mime: 'application/octet-stream',
                path: Path.join(test_util.get_fixtures(), 'workspace-dev-test/.bilrost/search_index_keystore'),
                hasChildren: false,
                isDirectory : () => true
            },
            {
                dev: 1761243593,
                mode: 33206,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: undefined,
                ino: 24206847998300156,
                size: 846,
                blocks: undefined,
                atime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                mtime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                ctime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                birthtime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                name: 'workspace',
                extension: '',
                mime: 'application/octet-stream',
                path: Path.join(test_util.get_fixtures(), 'workspace-dev-test/.bilrost/workspace'),
                isDirectory : () => false
            },
            {
                dev: 1761243593,
                mode: 33206,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: undefined,
                ino: 24206847998300156,
                size: 846,
                blocks: undefined,
                atime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                mtime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                ctime: "Wed Feb 15 2017 07:20:08 GMT-0800 (Pacific Standard Time)",
                birthtime: "Wed Feb 15 2017 07:20:07 GMT-0800 (Pacific Standard Time)",
                name: 'project',
                extension: '',
                mime: 'application/octet-stream',
                path: Path.join(test_util.get_fixtures(), 'workspace-dev-test/.bilrost/workspace'),
                isDirectory : () => false
            }
        ]
    },
    "readJsonSync" : {
        ".bilrost/workspace" : () => example_workspace,
        ".bilrost/project" : () => example_project
    },
    "access" : {
        "test/test" : () => Promise.resolve(),
        "/test" : () => Promise.resolve()
    }
};

const workspace_identifiers = {
    guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
    name: "test-workspace",
    file_uri: test_util.get_eloise_file_uri()
};

describe('Integrity status', function() {

    before("create fixtures", function(done) {

        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        test_util.create_eloise_fixtures()
            .then(() => test_util.create_eloise_workspace_properties_file())
            .then(() => {
                const adapter = ifs_adapter(test_util.get_eloise_path(), ifs_map);
                const get_internal_file_path = p => Path.join('.', '.bilrost', p ? p : '');
                const fake_workspace = {
                    get_guid: () => workspace_identifiers.guid,
                    get_internal_file_path: get_internal_file_path,
                    adapter: adapter,
                    database: assets_collection(workspace_identifiers.guid),
                    status_collection: status_collection(workspace_identifiers.guid),
                    utilities: workspace_utilities(get_internal_file_path)
                };
                asset_status_instance = new Asset_integrity_status(fake_workspace);
                workspace_status_instance = new Workspace_integrity_status(fake_workspace);
                database = fake_workspace.database;
                collection = fake_workspace.status_collection;
                Promise.all([
                    favorite.add(workspace_identifiers),
                    database.add(test_util.read_asset_file("/assets/test_1_1_0.level")),
                    database.add(test_util.read_asset_file("/assets/prefab/test_2_1_0.prefab")),
                    database.add(test_util.read_asset_file("/assets/asset_wrong_type.prefab")),
                    database.add(test_util.read_asset_file("/assets/asset_wrong_schema.prefab"))
                ]).then(function() {
                    done();
                }).catch(done);
            });
    });

    after("Clean favorite list", function(done) {
        favorite.remove(workspace_identifiers.guid).then(done);
    });

    after("Reset database", function(done) {
        database.close()
            .then(done, done);
    });

    describe('Missing state', function() {

        it('Asset validator', function(done){
            asset_status_instance.sync_from_database()
                .then(() => collection.get('assets_validator'))
                .then(status => {
                    should.exist(status);
                    should.deepEqual(status, {
                        ref: "assets_validator",
                        state: "DELETED",
                        description: "The validation hasn't been ran yet!",
                        info: {}
                    });
                    done();
                }).catch(done);
        });

        it('Worspace validator', function(done){
            workspace_status_instance
                .sync_from_database()
                .then(() => Promise.all([
                    collection.get('assets_validator'),
                    collection.get('workspace_validator')
                ]))
                .then(statuses => {
                    should.deepEqual(statuses, [{
                        ref: "assets_validator",
                        state: "DELETED",
                        description: "The validation hasn't been ran yet!",
                        info: {}
                    },
                    {
                        ref: "workspace_validator",
                        state: "DELETED",
                        description: "The validation hasn't been ran yet!",
                        info: {}
                    }]);
                    done();
                }).catch(done);
        });

    });

    describe('Invalid state', function() {

        it('Asset validator', function(done){
            asset_status_instance
                .run()
                .then(() => Promise.all([
                    collection.get('assets_validator'),
                    collection.get('workspace_validator')
                ]))
                .then(statuses => {
                    statuses.should.containDeep([{
                        ref: "assets_validator",
                        state: "INVALID",
                        description: "The validation failed!"
                    },
                    {
                        ref: "workspace_validator",
                        state: "DELETED",
                        description: "The validation hasn't been ran yet!"
                    }]);
                    done();
                })
                .catch(done);
        });

        it('Workspace validator', function(done){
            workspace_status_instance
                .run()
                .then(() => Promise.all([
                    collection.get('assets_validator'),
                    collection.get('workspace_validator')
                ]))
                .then(statuses => {
                    statuses.should.containDeep([{
                        ref: "assets_validator",
                        state: "INVALID",
                        description: "The validation failed!"
                    },
                    {
                        ref: "workspace_validator",
                        state: "INVALID",
                        description: "The validation failed!"
                    }]);
                    example_workspace.pushed_at = "2011-01-26T19:01:12Z";
                    done();
                })
                .catch(done);

        });

    });

    describe('Valid state', function() {

        it('Asset validator', function(done) {
            database.flush()
                .then(() => {
                    return database
                        .add(test_util.read_asset_file("/assets/test_1_1_0.level"))
                        .then(() => asset_status_instance.run())
                        .then(() => Promise.all([
                            collection.get('assets_validator'),
                            collection.get('workspace_validator')
                        ]))
                        .then(statuses => {
                            statuses.should.containDeep([{
                                ref: "assets_validator",
                                state: "VALID",
                                description: "The validation succeeded!"
                            },
                            undefined]);
                            done();
                        });
                })
                .catch(done);
        });

        it('Workspace validator', function(done){
            workspace_status_instance
                .run()
                .then(() => Promise.all([
                    collection.get('assets_validator'),
                    collection.get('workspace_validator')
                ]))
                .then(statuses => {
                    statuses.should.containDeep([{
                        ref: "assets_validator",
                        state: "VALID",
                        description: "The validation succeeded!"
                    },
                    {
                        ref: "workspace_validator",
                        state: "VALID",
                        description: "The validation succeeded!"
                    }]);
                    done();
                })
                .catch(done);

        });

    });

    /*describe('Pending state', function() {

        it('Asset_validator', function(done){

            asset_status_instance.run();
            setTimeout(function() {
                let workspace = favorite_search(test_util.get_eloise_file_uri());
                should.exist(workspace.status);
                should.deepEqual(workspace.status, [{
                    context: "assets_validator",
                    state: "PENDING",
                    description: "The validation is pending!",
                    info: {}
                },
                {
                    context: "workspace_validator",
                    state: "VALID",
                    description: "The validation succeeded!",
                    info: {}
                }]);
                done();
            }, 4);

        });

        it('Worspace_validator', function(done){

            workspace_status_instance.run();
            setTimeout(function() {
                let workspace = favorite_search(test_util.get_eloise_file_uri());
                should.exist(workspace.status);
                should.deepEqual(workspace.status, [{
                    context: "assets_validator",
                    state: "PENDING",
                    description: "The validation is pending!",
                    info: {}
                },
                {
                    context: "workspace_validator",
                    state: "PENDING",
                    description: "The validation is pending!",
                    info: {}
                }]);
                done();
            }, 4);

        });

    });*/
});
