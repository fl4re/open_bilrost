/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const favorite = require('../../assetmanager/favorite')();

const fixture = require('../util/fixture')('unit_commit_manager');
const workspace = require('../util/workspace')('eloise', fixture);

const Subscription_manager = require('../../assetmanager/subscription_manager');
const project = require('../../assetmanager/project');
const Stage_manager = require('../../assetmanager/stage_manager');
const commitmanager = require('../../assetmanager/commit_manager');
const mock_workspace = require('../util/mocks/workspace');
const Mock_repo_manager = require('../util/mocks/repo_manager');

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

describe('Commit Manager', function() {
    let subscription_manager, stage_manager, commit_manager, repo_manager, mock_repo_manager_instance;

    const workspace_identifiers = {
        guid: "e39d0f72c81c445ba801dsssssss45219sddsdss",
        name: "test-workspace",
        file_uri: workspace.get_file_uri(),
        version_id: "41"
    };

    let mock_workpsace;

    before("create fixtures", async function () {
        this.timeout(4000);
        await workspace.create('good_repo');
        await workspace.create_workspace_resource();
        await workspace.create_project_resource();
        mock_workpsace = await mock_workspace(workspace.get_guid(), workspace.get_path(), "s3", ifs_map, "good_repo")
        mock_workpsace.properties = workspace.get_workspace_resource();
        mock_workpsace.project = project(workspace.get_project_resource());
        subscription_manager = new Subscription_manager(mock_workpsace);
        stage_manager = new Stage_manager(mock_workpsace);
        repo_manager = mock_workpsace.resource.repo_manager;
        mock_repo_manager_instance = new Mock_repo_manager(repo_manager.cwd);
        mock_repo_manager_instance.type = 'git';
        commit_manager = commitmanager(mock_workpsace, mock_repo_manager_instance, mock_workpsace.asset.find_asset_by_ref, mock_workpsace.asset.repo_manager.read);

        mock_workpsace.subscription_manager = subscription_manager;
        mock_workpsace.stage_manager = stage_manager;
        mock_workpsace.commit_manager = commit_manager;

        stage_manager.stage = ['/assets/test_1_1_0.level'];

        await Promise.all([
            favorite.add(workspace_identifiers),
            mock_workpsace.database.add(workspace.read_asset("/assets/test_1_1_0.level")),
            mock_workpsace.database.add(workspace.read_asset("/assets/levels/test_001.level")),
        ]);
    });

    after("Flush search index map", function(done) {
        mock_workpsace.database.close()
            .then(() => favorite.remove(workspace_identifiers.guid))
            .then(done, done);
    });

    it('Get empty list of commitable files', function(done){
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

        mock_workpsace.resource.repo_manager = mock_repo_manager_instance;

        commit_manager.get_commitable_files()
            .then(commitable_files => {
                commitable_files.del_paths.should.be.empty();
                commitable_files.mod_paths.should.be.empty();
                commitable_files.add_paths.should.be.empty();
                done();
            })
            .catch(done);
    });

    it('Get commitable files with deleted asset', function(done){
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

        workspace.remove_asset("/assets/test_1_1_0.level");

        commit_manager.get_commitable_files()
            .then(commitable_files => {
                commitable_files.del_paths[0].should.equal('/.bilrost/assets/test_1_1_0.level');
                commitable_files.mod_paths.should.be.empty();
                commitable_files.add_paths.should.be.empty();
                done();
            })
            .catch(done);
    });

    it('Commit changes on deleted files', function(done){
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

        commit_manager.commit_files('Test commit')
            .then(commit_id => {
                should.exist(commit_id);
                done();
            })
            .catch(done);
    });

    it('Get empty list of commitable files after commit', function(done){
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000

        mock_workpsace.resource.repo_manager = mock_repo_manager_instance;

        commit_manager.get_commitable_files()
            .then(commitable_files => {
                commitable_files.del_paths.should.be.empty();
                commitable_files.mod_paths.should.be.empty();
                commitable_files.add_paths.should.be.empty();
                done();
            })
            .catch(done);
    });
});
