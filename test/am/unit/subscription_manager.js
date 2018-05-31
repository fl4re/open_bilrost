/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Print stack trace for debugging
global.debug = true;

const fs = require('fs-extra');
const path = require('path').posix;
const favorite = require('../../../assetmanager/favorite')();

const Subscription = require('../../../assetmanager/subscription');
const Subscription_manager = require('../../../assetmanager/subscription_manager');
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
        ".bilrost\\resources\\test" : () => Promise.resolve(),
        ".bilrost/resources/test" : () => Promise.resolve(),
        ".bilrost\\resources\\test\\test" : () => Promise.resolve(),
        ".bilrost/resources/test/test" : () => Promise.resolve(),
        ".bilrost\\resources\\test\\test_001" : () => Promise.resolve(),
        ".bilrost/resources/test/test_001" : () => Promise.resolve(),
        ".bilrost\\resources\\mall\\mall_demo" : () => Promise.resolve(),
        ".bilrost/resources/mall/mall_demo" : () => Promise.resolve(),
        "test" : () => Promise.resolve(),
        "test/test" : () => Promise.resolve(),
        "test/test_001" : () => Promise.resolve(),
        "mall/mall_demo" : () => Promise.reject("can't be open")
    }
};

describe('Subscription Manager', function() {
    let subscription_manager;

    let test_util = new Test_util("subscription", "good_repo");

    const workspace_identifiers = {
        guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
        name: "test-workspace",
        file_uri: test_util.get_eloise_file_uri(),
        version_id: "41"
    };

    let workspace_instance;

    before("create fixtures", function(done) {
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        test_util.create_eloise_fixtures()
            .then(() => test_util.create_eloise_workspace_properties_file())
            .then(() => {
                mock_workspace(workspace_identifiers.guid, path.join(test_util.get_eloise_path()), "s3", ifs_map, 'good_repo')
                    .then(workspace => {
                        workspace_instance = workspace;
                        workspace.properties = test_util.eloise;
                        subscription_manager = new Subscription_manager(workspace);
                        Promise.all([
                            favorite.add(workspace_identifiers),
                            workspace.database.add(test_util.read_asset_file("/assets/test_1_1_0.level")),
                            workspace.database.add(test_util.read_asset_file("/assets/levels/test_001.level")),
                        ]).then(function () {
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

    it('Get empty subscription list', function(done){
        try {
            subscription_manager.get_subscriptions().should.be.empty();

            done();
        } catch (err) {
            done(err);
        }
    });

    let s_id;
    it('Add Asset subscription', function(done){
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

        subscription_manager.add_subscription(Subscription.ASSET, "/assets/test_1_1_0.level")
            .then(subscription => {
                s_id = subscription.id;

                subscription_manager.get_subscriptions().should.not.be.empty();

                subscription_manager.get_subscriptions()[0].type.should.equal(Subscription.ASSET);
                subscription_manager.get_subscriptions()[0].descriptor.should.equal("/assets/test_1_1_0.level");
                done();
            })
            .catch(done);
    });

    it('Fail to add two same subscriptions', function(done){
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

        subscription_manager.add_subscription(Subscription.ASSET, "/assets/test_1_1_0.level")
           .then(subscription => {
                s_id = subscription.id;

                subscription_manager.get_subscriptions().should.not.be.empty();

                subscription_manager.get_subscriptions()[0].type.should.equal(Subscription.ASSET);
                subscription_manager.get_subscriptions()[0].descriptor.should.equal("/assets/test_1_1_0.level");
                done();
            })
            .catch(done);
    });

    // it('Fail to add Asset subscription with invalid dependencies', function(done){
    //     this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

    //     subscription_manager.add_subscription(Subscription.ASSET, "/assets/levels/test_001.level")
    //         .catch(err => {
    //             done();
    //         });
    // });

    it('Get removed assets', function(done){
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        const asset_path = path.join(test_util.get_workspace_path(), '.bilrost/assets/test_1_1_0.level');
        const asset = fs.readJsonSync(asset_path);
        fs.removeSync(asset_path);
        subscription_manager.get_assets()
            .then(assets => {
                assets.length.should.equal(1);
                assets[0].meta.ref.should.equal('/assets/test_1_1_0.level');
                fs.writeJsonSync(asset_path, asset);
                done();
            })
            .catch(done);
    });

    it('Update workspace subscription list', function(done){
        try {
            test_util.eloise.subscriptions = subscription_manager.get_subscriptions();
            Workspace_factory.save(test_util.eloise);

            subscription_manager.get_subscriptions().should.not.be.empty();
            test_util.eloise.subscriptions.should.not.be.empty();

            done();
        } catch (err) {
            done(err);
        }
    });

    it('Remove added subscription from list', function(done){
        try {
            subscription_manager.remove_subscription(s_id);

            subscription_manager.get_subscriptions().should.be.empty();
            test_util.eloise.subscriptions.should.not.be.empty();

            done();
        } catch (err) {
            done(err);
        }
    });

    it('Update workspace subscription list', function(done){
        test_util.eloise.subscriptions = subscription_manager.get_subscriptions();
        Workspace_factory.save(test_util.eloise)
            .then(function () {
                subscription_manager.get_subscriptions().should.be.empty();
                test_util.eloise.subscriptions.should.be.empty();

                done();
            }).catch(done);
    });

});
