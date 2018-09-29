/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const fixture = require('../util/fixture')('uni_test_integrity_status');
const workspace = require('../util/workspace')('eloise', fixture);

const Asset_integrity_status = require('../../assetmanager/integrity_status').Asset;
const Workspace_integrity_status = require('../../assetmanager/integrity_status').Workspace;
const ifs_adapter = require('../util/mocks/ifs_adapter');
const assets_collection = require('../../assetmanager/databases/assets_collection');
const status_collection = require('../../assetmanager/databases/status_collection');
const workspace_utilities = require('../../assetmanager/workspace_utilities');

let asset_status_instance, workspace_status_instance, database, collection;

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
                path: workspace.get_internal_path('assets'),
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
                path: workspace.get_internal_path('search_index_keystore'),
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
                path: workspace.get_internal_path('workspace'),
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
                path: workspace.get_internal_path('project'),
                isDirectory : () => false
            }
        ]
    },
    "readJsonSync" : {
        ".bilrost/workspace" : () => workspace.get_workspace_resource(),
        ".bilrost/project" : () => workspace.get_project_resource()
    },
    "access" : {
        "test/test" : () => Promise.resolve(),
        "/test" : () => Promise.resolve()
    }
};

const workspace_identifiers = {
    guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
    name: "test-workspace",
    file_uri: workspace.get_file_uri()
};

describe('Integrity status', function() {

    before("create fixtures", async function () {

        this.timeout(5000);
        await workspace.create('bad_repo');
        await workspace.create_workspace_resource();
        await workspace.create_project_resource();
        const adapter = ifs_adapter(workspace.get_path(), ifs_map);
        const fake_workspace = {
            get_guid: () => workspace_identifiers.guid,
            get_internal_file_path: workspace.get_internal_file_path,
            adapter: adapter,
            database: assets_collection(workspace_identifiers.guid),
            status_collection: status_collection(workspace_identifiers.guid),
            utilities: workspace_utilities(workspace.get_internal_file_path)
        };
        asset_status_instance = new Asset_integrity_status(fake_workspace);
        workspace_status_instance = new Workspace_integrity_status(fake_workspace);
        database = fake_workspace.database;
        collection = fake_workspace.status_collection;
        await Promise.all([
            database.add(workspace.read_asset("/assets/test_1_1_0.level")),
            database.add(workspace.read_asset("/assets/prefab/test_2_1_0.prefab")),
            database.add(workspace.read_asset("/assets/asset_wrong_type.prefab")),
            database.add(workspace.read_asset("/assets/asset_wrong_schema.prefab"))
        ]);
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
                        .add(workspace.read_asset("/assets/test_1_1_0.level"))
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
                    }/*,
                    {
                        ref: "workspace_validator",
                        state: "VALID",
                        description: "The validation succeeded!"
                    }*/]);
                    done();
                })
                .catch(done);

        });

    });

});
