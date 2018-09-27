/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Print stack trace for debugging
global.debug = true;

const should = require('should');
const favorite = require('../../assetmanager/favorite')();

const Subscription = require('../../assetmanager/subscription');
const Subscription_manager = require('../../assetmanager/subscription_manager');
const Workspace_factory = require('../../assetmanager/workspace_factory');

const fixture = require('../util/fixture')('unit_subscription_manager');
const workspace = require('../util/workspace')('eloise', fixture);
const mock_workspace = require('../util/mocks/workspace');

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

    const workspace_identifiers = {
        guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
        name: "test-workspace",
        file_uri: workspace.get_file_uri(),
        version_id: "41"
    };

    let workspace_instance;

    before("create fixtures", async function() {
        this.timeout(4000);
        await workspace.create('good_repo');
        await workspace.create_workspace_resource();
        await workspace.create_project_resource();
        workspace_instance = await mock_workspace(workspace.get_guid(), workspace.get_path(), "s3", ifs_map, 'good_repo');
        workspace_instance.properties = workspace.get_workspace_resource();
        subscription_manager = new Subscription_manager(workspace_instance);
        await Promise.all([
            favorite.add(workspace_identifiers),
            workspace_instance.database.add(workspace.read_asset("/assets/test_1_1_0.level")),
            workspace_instance.database.add(workspace.read_asset("/assets/levels/test_001.level")),
        ]);
    });

    after("Flush search index map", async function() {
        await workspace_instance.database.close();
        await favorite.remove(workspace_identifiers.guid);
    });

    it('Get empty subscription list', function(done){
        try {
            should.deepEqual(subscription_manager.get_subscriptions(), []);
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

    it('Get removed assets', async function() {
        this.timeout(4000);
        const ref = '/assets/test_1_1_0.level';
        const asset = workspace.read_asset(ref);
        workspace.remove_asset(ref);
        const assets = await subscription_manager.get_assets();
        assets.length.should.equal(1);
        assets[0].meta.ref.should.equal(ref);
        workspace.create_asset(asset);
    });

    it('Update workspace subscription list', async function() {
        const resource = workspace.get_workspace_resource();
        resource.subscriptions = subscription_manager.get_subscriptions();
        await Workspace_factory.save(resource);
        subscription_manager.get_subscriptions().should.not.be.empty();
        resource.subscriptions.should.not.be.empty();
    });

    it('Remove added subscription from list', function(done) {
        try {
            subscription_manager.remove_subscription(s_id);
            subscription_manager.get_subscriptions().should.be.empty();
            //const resource = workspace.get_workspace_resource();
            //resource.subscriptions.should.not.be.empty();
            done();
        } catch (err) {
            done(err);
        }
    });

    it('Update workspace subscription list', async function() {
        const resource = workspace.get_workspace_resource();
        resource.subscriptions = subscription_manager.get_subscriptions();
        await Workspace_factory.save(resource);
        subscription_manager.get_subscriptions().should.be.empty();
        resource.subscriptions.should.be.empty();
    });

});
