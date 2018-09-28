/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const fs = require('fs-extra');
const Path = require('path').posix;
const exec = require('child_process').exec;
const favorite = require('../../assetmanager/favorite')();

const asset = require('../../assetmanager/asset');

const mock_workspace = require('../util/mocks/workspace');

let isWin = /^win/.test(process.platform);

let status_manager_instance, database, collection;

const fixtures = Path.join(process.cwd().replace(/\\/g, '/'), 'tmp', 'functional_status_manager_github');

let example_url = Path.join(fixtures.replace(/\\/g,'/'),'example');
example_url = 'file://'+ (isWin?'/':'') + example_url;

var example_workspace = {
    "guid": "e39d0f72c81c445ba801dsssssss45219sddsdss",
    "name": "test-workspace",
    "description": "This is your first workspace cloned from DLC_1 branch !",
    "version": "2.0.0",
    "pushed_at": "2011-01-26T19:01:12Z",
    "created_at": "2011-01-26T19:01:12Z",
    "updated_at": "2011-01-26T19:14:43Z",
    "type": 'application/vnd.bilrost.workspace+json',
    "file_uri": "file:///a/b",
    "tags": ["Hello", "World"],
    "subscriptions": [],
    "stage": []
};

var example_project = {
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

const level_1_0_0 = {
    "uri": "assets/test_1_0_0.level",
    "type": "application/vnd.bilrost.level+json",
    "created": "2016-03-18T15:04:02.267Z",
    "modified": "2016-04-22T12:42:12.449Z",
    "author": "",
    "comment": "",
    "tag": [],
    "entryPoint": "resources/test",
    "collection": [],
    "setting": []
};

const level_1_1_0 = {
    "meta":{
        "ref": "/assets/test_1_1_0.level",
        "type": "application/vnd.bilrost.level+json",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "author": "",
        "version":"1.1.0"
    },
    "comment": "",
    "tags": [],
    "main": "/resources/sample",
    "dependencies": [
        "/resources/test/test"
    ],
    "semantics": []
};

const prefab_1_0_0 = {
    "uri": "assets/prefab/test_1_0_0.prefab",
    "type": "application/vnd.bilrost.prefab+json",
    "created": "2016-03-18T15:04:02.267Z",
    "modified": "2016-04-22T12:42:12.449Z",
    "author": "",
    "comment": "",
    "tag": [],
    "entryPoint": "resources/prefab/test",
    "collection": [],
    "setting": []
};

const prefab_1_1_0 = {
    "meta":{
        "ref": "/assets/prefab/test_1_1_0.prefab",
        "type": "application/vnd.bilrost.prefab+json",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "author": "",
        "version":"1.1.0"
    },
    "comment": "",
    "tags": [],
    "main": "/resources/prefab/test",
    "dependencies": [
        "/resources/test/prefab/test"
    ],
    "semantics": []
};

const prefab_2_1_0 = {
    "meta":{
        "ref": "/assets/prefab/test_2_1_0.prefab",
        "type": "application/vnd.bilrost.prefab+json",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "author": "",
        "version":"2.1.0"
    },
    "comment": "",
    "tags": [],
    "main": "/resources/prefab/test",
    "dependencies": [
        "/resources/test/prefab/test"
    ],
    "semantics": []
};

const asset_wrong_type = {
    "meta": {
        "ref": "/assets/asset_wrong_type.prefab",
        "type": "application/vnd.bilrost.cinematic+json",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "author": "",
        "version":"1.1.0"
    },
    "comment": "",
    "tags": [],
    "main": "/resources/prefab/test",
    "dependencies": [
        "/resources/test/prefab/test"
    ],
    "semantics": []
};

const asset_wrong_schema = {
    "meta":{
        "ref": "/assets/asset_wrong_schema.prefab",
        "type": "application/vnd.bilrost.prefab+json",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "author": "",
        "version":"1.1.0"
    },
    "comment": "",
    "tags": [],
    "main": "resources/prefab/test",
    "dependencies": [
        "/resources/test/prefab/test"
    ],
    "semantics": []
};

const asset_invalid_path = {
    "meta":{
        "ref": "/assets/asset_invalid_path.prefab",
        "type": "application/vnd.bilrost.prefab+json",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "author": "",
        "version":"1.1.0"
    },
    "comment": "",
    "tags": [],
    "main": "/resources/invalid_path",
    "dependencies": [
        "/resources/invalid_path"
    ],
    "semantics": []
};

const workspace_identifiers = {
    guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
    name: "test-workspace",
    file_uri: example_url
};

describe("Run set of test for github status manager", function() {

    before("create fixtures", function(done) {
        //cleanup fixtures
        fs.removeSync(fixtures);
        fs.mkdirpSync(fixtures);
        exec("git init", {cwd: fixtures}, function(error, stdout, stderr) {
            if (error||stderr) {
                done(error||stderr);
            } else {
                //workspace resource
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', 'workspace'), example_workspace);

                //project resource
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', 'project'), example_project);

                //assets
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', level_1_0_0.uri), level_1_0_0);
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', level_1_1_0.meta.ref), level_1_1_0);
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', prefab_1_0_0.uri), prefab_1_0_0);
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', prefab_1_1_0.meta.ref), prefab_1_1_0);
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', prefab_2_1_0.meta.ref), prefab_2_1_0);
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', asset_wrong_type.meta.ref), asset_wrong_type);
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', asset_wrong_schema.meta.ref), asset_wrong_schema);
                fs.outputJsonSync(Path.join(fixtures, '.bilrost', asset_invalid_path.meta.ref), asset_invalid_path);

                //resources
                fs.outputJsonSync(Path.join(fixtures, 'sample'), {});
                fs.outputJsonSync(Path.join(fixtures, 'test/test'), {});
                fs.outputJsonSync(Path.join(fixtures, 'prefab/test'), {});
                fs.outputJsonSync(Path.join(fixtures, 'test/prefab/test'), {});
                exec("git add --all", {cwd: fixtures}, error => {
                    if (error) {
                        done(error);
                    } else {
                        exec('git commit -m "First commit"', {cwd: fixtures}, error => {
                            if (error) {
                                done(error);
                            } else {
                                const Adapter = require('../../ifs/local_fs_adapter');

                                new Adapter(fixtures)
                                    .then(adapter => {
                                        mock_workspace(workspace_identifiers.guid, '', 's3', {}, 'test', adapter)
                                            .then(fake_workspace => {
                                                fake_workspace.asset = asset(fake_workspace);
                                                status_manager_instance = fake_workspace.status_manager;
                                                database = fake_workspace.database;
                                                collection = fake_workspace.status_collection;
                                                return Promise.all([
                                                    favorite.add(workspace_identifiers),
                                                    database.add(level_1_1_0),
                                                    database.add(prefab_1_1_0),
                                                    database.add(prefab_2_1_0),
                                                    database.add(asset_wrong_type),
                                                    database.add(asset_wrong_schema),
                                                    database.add(asset_invalid_path)
                                                ]).then(() => {
                                                    done();
                                                });
                                            });
                                    }).catch(done);
                            }
                        });
                    }
                });
            }
        });
    });

    after("Clean favorite list", function(done) {
        database.flush()
            .then(() => database.close())
            .then(() => favorite.remove(workspace_identifiers.guid))
            .then(done);
    });

    it("Fail validation check", function(done) {
        this.timeout(3*this.timeout()); // = 2 * default = 2 * 2000 = 4000
        status_manager_instance
            .check_overall_validation()
            .then(function() {
                done("This shouldn't pass");
            })
            .catch(() => Promise.all([
                collection.get("workspace_validator"),
                collection.get("assets_validator")
            ]))
            .then(statuses => {
                const workspace_status = statuses[0];
                const asset_status = statuses[1];
                should.equal(workspace_status.state, "VALID");
                should.equal(asset_status.state, "INVALID");
                done();
            })
            .catch(done);
    });
    it("Success validation check with diff", function(done) {
        fs.removeSync(Path.join(fixtures, '.bilrost', asset_wrong_type.meta.ref));
        fs.removeSync(Path.join(fixtures, '.bilrost', asset_wrong_schema.meta.ref));
        fs.removeSync(Path.join(fixtures, '.bilrost', asset_invalid_path.meta.ref));
        fs.removeSync(Path.join(fixtures, ".bilrost", "/assets/prefab/test_2_1_0.prefab"));
        Promise.all([
            database.remove(asset_wrong_type.meta.ref),
            database.remove(asset_wrong_schema.meta.ref),
            database.remove(asset_invalid_path.meta.ref),
            database.remove("/assets/prefab/test_2_1_0.prefab"),
        ]).then(function(){
            status_manager_instance
                .check_overall_validation()
                .then(() => Promise.all([
                    collection.get("workspace_validator"),
                    collection.get("assets_validator")
                ]))
                .then(statuses => {
                    const workspace_status = statuses[0];
                    const asset_status = statuses[1];
                    should.equal(workspace_status.state, "VALID");
                    should.equal(asset_status.state, "VALID");
                    done();
                }).catch(function(err) {
                    done(err);
                });
        });
    });
    it("Success validation check with new commit", function(done) {
        exec('git commit -am "Second commit"', {cwd: fixtures}, () => {
            status_manager_instance
                .check_overall_validation()
                .then(() => Promise.all([
                    collection.get("workspace_validator"),
                    collection.get("assets_validator")
                ]))
                .then(statuses => {
                    const workspace_status = statuses[0];
                    const asset_status = statuses[1];
                    should.equal(workspace_status.state, "VALID");
                    should.equal(asset_status.state, "VALID");
                    done();
                });
        });
    });
    it("Success validation check with same commit_id", function(done) {
        status_manager_instance
            .check_overall_validation()
            .then(() => Promise.all([
                collection.get("workspace_validator"),
                collection.get("assets_validator")
            ]))
            .then(statuses => {
                const workspace_status = statuses[0];
                const asset_status = statuses[1];
                should.equal(workspace_status.state, "VALID");
                should.equal(asset_status.state, "VALID");
                done();
            });
    });
    it("Fail validation check with new invalid diff by modifying an asset", function(done) {
        const asset_path = Path.join(fixtures, '.bilrost', level_1_1_0.meta.ref);
        asset_wrong_type.meta.ref = level_1_1_0.meta.ref;
        fs.outputJsonSync(asset_path, asset_wrong_type);
        database
            .add(asset_wrong_type)
            .then(() => {
                status_manager_instance
                    .check_overall_validation()
                    .then(function() {
                        done("This shouldn't pass!");
                    })
                    .catch(() => Promise.all([
                        collection.get("workspace_validator"),
                        collection.get("assets_validator")
                    ]))
                    .then(statuses => {
                        const workspace_status = statuses[0];
                        const asset_status = statuses[1];
                        should.equal(workspace_status.state, "VALID");
                        should.equal(asset_status.state, "INVALID");
                        fs.outputJsonSync(asset_path, level_1_1_0);
                        database.remove(level_1_1_0.meta.ref)
                            .then(() => database.add(level_1_1_0))
                            .then(() => done());
                    }).catch(function(err) {
                        done(err);
                    });
            });
    });
    it("Fail validation check with new status by adding again same asset previously removed", function(done) {
        this.timeout(2*this.timeout()); // = 2 * default = 2 * 2000 = 4000
        const asset_path = Path.join(fixtures, '.bilrost', asset_wrong_schema.meta.ref);
        fs.outputJsonSync(asset_path, asset_wrong_schema);
        database
            .add(asset_wrong_schema)
            .then(() => {
                status_manager_instance.check_overall_validation().then(function() {
                    done("This shouldn't pass!");
                })
                    .catch(() => Promise.all([
                        collection.get("workspace_validator"),
                        collection.get("assets_validator")
                    ]))
                    .then(statuses => {
                        const workspace_status = statuses[0];
                        const asset_status = statuses[1];
                        should.equal(workspace_status.state, "VALID");
                        should.equal(asset_status.state, "INVALID");
                        fs.removeSync(asset_path);
                        return database.remove(asset_wrong_schema.meta.ref)
                            .then(() => done());
                    }).catch(function(err) {
                        done(err);
                    });
            });
    });
    it("Fail validation check with unstaged file list by adding invalid asset", function(done) {
        this.timeout(2*this.timeout()); // = 2 * default = 2 * 2000 = 4000
        const asset_path_1 = Path.join(fixtures, "example/.bilrost/assets/new/asset_wrong_type.prefab");
        const asset_path_2 = Path.join(fixtures, "example/.bilrost/assets/wrong_schema.prefab");
        fs.outputJsonSync(asset_path_1, asset_wrong_type);
        fs.outputJsonSync(asset_path_2, asset_wrong_schema);
        Promise.all([
            database.add(asset_wrong_type),
            database.add(asset_wrong_schema)
        ]).then(() => {
            status_manager_instance
                .check_overall_validation()
                .then(function() {
                    done("This shouldn't pass!");
                })
                .catch(() => Promise.all([
                    collection.get("workspace_validator"),
                    collection.get("assets_validator")
                ]))
                .then(statuses => {
                    const workspace_status = statuses[0];
                    const asset_status = statuses[1];
                    should.equal(workspace_status.state, "VALID");
                    should.equal(asset_status.state, "INVALID");
                    fs.removeSync(asset_path_1);
                    fs.removeSync(asset_path_2);
                    done();
                }).catch(function(err) {
                    done(err);
                });
        });
    });

    describe('Get Manager Status', function() {
        it('Valid General Status', function(done){
            Promise.all([
                collection.update("workspace_validator", { state: 'VALID' }),
                collection.update("assets_validator", { state: 'VALID' })
            ]).then(() => {
                status_manager_instance
                    .get_general_status()
                    .then(general_status => {
                        should.exist(general_status);
                        should.equal(general_status.get_state(), "VALID");
                        done();
                    }).catch(function(err) {
                        done(err);
                    });
            });
        });

        it('Missing General Status', function(done){
            Promise.all([
                collection.update("workspace_validator", { state: 'VALID' }),
                collection.update("assets_validator", { state: 'DELETED' })
            ]).then(() => {
                status_manager_instance
                    .get_general_status()
                    .then(general_status => {
                        should.exist(general_status);
                        should.equal(general_status.get_state(), "DELETED");
                        done();
                    }).catch(function(err) {
                        done(err);
                    });
            });
        });

        it('Invalid General Status', function(done){
            Promise.all([
                collection.update("workspace_validator", { state: 'INVALID' }),
                collection.update("assets_validator", { state: 'DELETED' })
            ]).then(() => {
                status_manager_instance
                    .get_general_status()
                    .then(general_status => {
                        should.exist(general_status);
                        should.equal(general_status.get_state(), "INVALID");
                        done();
                    }).catch(function(err) {
                        done(err);
                    });
            });
        });
    });

});
