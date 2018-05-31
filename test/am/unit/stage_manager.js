/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const path = require('path').posix;
const favorite = require('../../../assetmanager/favorite')();

const Subscription_manager = require('../../../assetmanager/subscription_manager');
const Subscription = require('../../../assetmanager/subscription');
const Subscription_factory = require('../../../assetmanager/subscription_factory');
const Stage_manager = require('../../../assetmanager/stage_manager');
const Workspace_factory = require('../../../assetmanager/workspace_factory');
const Test_util = require('../../util/test_util');
const mock_workspace = require('../../util/mocks/workspace');

const ifs_map = {
    "readJson" : {
        ".bilrost/assets/prefab/test_1_0_0.prefab": () => Promise.resolve({
            "meta": {
                "ref": "/assets/test_1_1_0.level",
                "type": "application/vnd.bilrost.level+json",
                "created": "2016-03-16T14:41:10.384Z",
                "modified": "2016-03-18T10:54:05.870Z",
                "author": "",
                "version": "1.1.0"
            },
            "comment": "",
            "tags": [],
            "main": "/resources/test",
            "dependencies": [
                "/resources/test/test"
            ],
            "semantics": []
        }),
        ".bilrost/assets/levels/test_001.level": () => Promise.resolve({
            "meta": {
                "ref": "/assets/levels/test_001.level",
                "type": "application/vnd.bilrost.level+json",
                "created": "2016-03-16T14:41:10.384Z",
                "modified": "2016-03-18T10:54:05.870Z",
                "version": "1.1.0",
                "author": ""
            },
            "comment": "",
            "tags": [],
            "main": "/resources/test/test_001",
            "dependencies": [
                "/resources/mall/mall_demo"
            ],
            "semantics": []
        }),
    },

    "access" : {
        "/test" : () => Promise.resolve(),
        "/test/test" : () => Promise.resolve(),
        "/test/test_001" : () => Promise.resolve(),
        "/mall/mall_demo" : () => Promise.reject("can't be open"),
    }
};

describe('Stage Manager', function() {
    let subscription_manager, stage_manager;

    let test_util = new Test_util("stage", "good_repo");

    const workspace_identifiers = {
        guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
        name: "test-workspace",
        file_uri: test_util.get_eloise_file_uri(),
        version_id: "41"
    };

    let workspace_instance;

    before("create fixtures", function(done) {
        this.timeout(8*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        test_util.create_eloise_fixtures()
            .then(() => {
                mock_workspace(workspace_identifiers.guid, path.join(test_util.get_eloise_path()), "s3", ifs_map, 'good_repo')
                    .then(workspace => {
                        workspace_instance = workspace;
                        workspace.properties = test_util.eloise;
                        subscription_manager = new Subscription_manager(workspace);
                        workspace.subscription_manager = subscription_manager;
                        subscription_manager.subscriptions = [Subscription_factory.create(workspace, '123', Subscription.ASSET, "/assets/test_1_1_0.level")];
                        stage_manager = new Stage_manager(workspace);
                        Promise.all([
                            favorite.add(workspace_identifiers),
                            workspace.database.add(test_util.read_asset_file("/assets/test_1_1_0.level")),
                            workspace.database.add(test_util.read_asset_file("/assets/levels/test_001.level")),
                        ])
                        // TODO: This line is a hack to trigger search_index.
                        // The stage_manager.add_asset(ref) method doesn't work
                        // if this Asset.get() isn't run before it.
                        .then(() => subscription_manager.subscriptions[0].list_assets())
                        .then(function () {
                            done();
                        }).catch(done);
                    });
            });
    });

    after("Flush search index map", function (done) {
        workspace_instance.database.close()
            .then(() => favorite.remove(workspace_identifiers.guid))
            .then(done, done);
    });

    it('Get empty stage list', function(done){
        try {
            stage_manager.get_stage().should.be.empty();

            done();
        } catch (err) {
            done(err);
        }
    });

    it('Add Asset to Workspace Stage', function(done){
        test_util.remove_asset_file("/assets/test_1_1_0.level");
        stage_manager.add_asset("/assets/test_1_1_0.level")
            .then(() => {
                test_util.eloise.stage = stage_manager.get_stage();
                Workspace_factory.save(test_util.eloise);

                stage_manager.get_stage().should.not.be.empty();
                test_util.eloise.stage.should.not.be.empty();

                done();
            })
            .catch(done);
    });

    it('Dont fail to stage same asset twice because of idempotency', function(done){
        stage_manager.add_asset("/assets/test_1_1_0.level")
            .then(() => {
                test_util.eloise.stage = stage_manager.get_stage();
                Workspace_factory.save(test_util.eloise);

                stage_manager.get_stage().should.not.be.empty();
                test_util.eloise.stage.should.not.be.empty();

                done();
            })
            .catch(done);
    });

    it('Fail to add not subscribed Asset to Workspace Stage', function(done){
        stage_manager.add_asset("/assets/levels/test_001.level")
            .catch(() => done());
    });

    it('Remove added Asset from Workspace Stage', function(done){
        try {
            stage_manager.remove_asset('/assets/test_1_1_0.level');

            test_util.eloise.stage = stage_manager.get_stage();
            Workspace_factory.save(test_util.eloise)
                .then(function () {
                    stage_manager.get_stage().should.be.empty();
                    test_util.eloise.stage.should.be.empty();

                    done();
                }).catch(done);
        } catch (err) {
            done(err);
        }
    });
});
