/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');

const Subscription_manager = require('../../assetmanager/subscription_manager');
const Subscription = require('../../assetmanager/subscription');
const Subscription_factory = require('../../assetmanager/subscription_factory');
const Stage_manager = require('../../assetmanager/stage_manager');
const Workspace_factory = require('../../assetmanager/workspace_factory');
const fixture = require('../util/fixture')('unit_stage_manager');
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
        "/test" : () => Promise.resolve(),
        "/test/test" : () => Promise.resolve(),
        "/test/test_001" : () => Promise.resolve(),
        "/mall/mall_demo" : () => Promise.reject("can't be open"),
    }
};

describe('Stage Manager', function() {
    let subscription_manager, stage_manager, workspace_instance;

    before("create fixtures", async function() {
        this.timeout(4000);
        await workspace.create('good_repo');
        workspace.create_workspace_resource();
        workspace.create_project_resource();
        workspace_instance =  await mock_workspace(workspace.get_guid(), workspace.get_path(), "s3", ifs_map, 'good_repo');
        workspace_instance.properties = workspace.get_workspace_resource();
        subscription_manager = new Subscription_manager(workspace_instance);
        workspace_instance.subscription_manager = subscription_manager;
        subscription_manager.subscriptions = [Subscription_factory.create(workspace_instance, '123', Subscription.ASSET, "/assets/test_1_1_0.level")];
        stage_manager = new Stage_manager(workspace_instance);
        await Promise.all([
            workspace_instance.database.add(workspace.read_asset("/assets/test_1_1_0.level")),
            workspace_instance.database.add(workspace.read_asset("/assets/levels/test_001.level")),
        ]);
    });

    after("Flush search index map", async function() {
        await workspace_instance.database.close();
    });

    it('Get empty stage list', function(done) {
        try {
            should.deepEqual(stage_manager.get_stage(), []);
            done();
        } catch (err) {
            done(err);
        }
    });

    it('Add Asset to Workspace Stage', async function() {
        workspace.remove_asset("/assets/test_1_1_0.level");
        await stage_manager.add_asset("/assets/test_1_1_0.level");
        const resource = workspace.get_workspace_resource();
        resource.stage = stage_manager.get_stage();
        await Workspace_factory.save(workspace.get_path(), resource);
        stage_manager.get_stage().should.not.be.empty();
        workspace.read_workspace_resource().stage.should.not.be.empty();
    });

    it('Dont fail to stage same asset twice because of idempotency', async function() {
        await stage_manager.add_asset("/assets/test_1_1_0.level");
        const resource = workspace.get_workspace_resource();
        resource.stage = stage_manager.get_stage();
        await Workspace_factory.save(workspace.get_path(), resource);
        stage_manager.get_stage().should.not.be.empty();
        workspace.read_workspace_resource().stage.should.not.be.empty();
    });

    it('Fail to add not subscribed Asset to Workspace Stage', function(done) {
        stage_manager.add_asset("/assets/levels/test_001.level")
            .catch(() => done());
    });

    it('Remove added Asset from Workspace Stage', async function() {
        stage_manager.remove_asset('/assets/test_1_1_0.level');
        const resource = workspace.get_workspace_resource();
        resource.stage = stage_manager.get_stage();
        await Workspace_factory.save(workspace.get_path(), resource);
        stage_manager.get_stage().should.be.empty();
        workspace.read_workspace_resource().stage.should.be.empty();
    });
});
